import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { Priority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { emitBoardUpdated } from '../lib/socket';
import { getUserCardMembership, getUserListMembership } from '../lib/permissions';
import { sendTaskAssignedEmail } from '../lib/email';

const createCardSchema = z.object({
  title: z.string().min(1, 'Judul kartu minimal 1 karakter'),
  description: z.string().optional(),
  listId: z.string().min(1, 'List ID diperlukan'),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  position: z.number().optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1, 'Judul kartu minimal 1 karakter').optional(),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  listId: z.string().optional(),
});

const moveCardSchema = z.object({
  targetListId: z.string().min(1, 'Target List ID diperlukan'),
  prevPosition: z.number().nullable().optional(),
  nextPosition: z.number().nullable().optional(),
});

export const createCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = createCardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { title, description, listId, priority, dueDate, assigneeId } = parseResult.data;

    // Verifikasi izin akses list dan workspace
    const { list, member } = await getUserListMembership(userId, listId);
    if (!list) {
      res.status(404).json({ error: 'Daftar tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    if (member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat membuat kartu' });
      return;
    }

    let position = parseResult.data.position;
    if (position === undefined) {
      const highestCard = await prisma.card.findFirst({
        where: { listId },
        orderBy: { position: 'desc' },
      });
      position = highestCard ? highestCard.position + 1000 : 1000;
    }

    const card = await prisma.card.create({
      data: {
        title,
        description: description || null,
        position,
        priority: priority || Priority.MEDIUM,
        dueDate: dueDate ? new Date(dueDate) : null,
        listId,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        comments: true,
        subtasks: { orderBy: { position: 'asc' } },
        labels: true,
        attachments: true,
      },
    });

    // Catat ke ActivityLog
    await prisma.activityLog.create({
      data: {
        action: 'CREATED_CARD',
        details: `Menambahkan kartu "${title}" pada kolom "${list.title}"`,
        entityType: 'CARD',
        entityId: card.id,
        boardId: list.boardId,
        workspaceId: list.board.workspaceId,
        userId,
      },
    });

    emitBoardUpdated(list.boardId, { type: 'CARD_CREATED', boardId: list.boardId, cardId: card.id, userId });

    // Kirim notifikasi email ke Gmail assignee jika kartu ditugaskan
    if (card.assignee?.email) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      sendTaskAssignedEmail(
        card.assignee.email,
        card.assignee.name,
        card.title,
        list.board.title,
        card.priority,
        card.dueDate ? card.dueDate.toISOString() : null,
        clientUrl,
        req.user?.name
      ).catch((err) => console.error('Gagal mengirim email tugas baru:', err));
    }

    res.status(201).json({ card });
  } catch (error) {
    console.error('createCard error:', error);
    res.status(500).json({ error: 'Gagal membuat kartu' });
  }
};

export const updateCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { card: existingCard, member } = await getUserCardMembership(userId, cardId);
    if (!existingCard) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    if (member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat mengubah kartu' });
      return;
    }

    const parseResult = updateCardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { dueDate, ...otherData } = parseResult.data;

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...otherData,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        subtasks: { orderBy: { position: 'asc' } },
        labels: true,
        attachments: true,
      },
    });

    const boardId = existingCard.list.boardId;

    await prisma.activityLog.create({
      data: {
        action: 'UPDATED_CARD',
        details: `Memperbarui rincian kartu "${updatedCard.title}"`,
        entityType: 'CARD',
        entityId: cardId,
        boardId,
        workspaceId: existingCard.list.board.workspaceId,
        userId,
      },
    });

    emitBoardUpdated(boardId, { type: 'CARD_UPDATED', boardId, cardId, userId });

    // Jika kartu baru saja ditugaskan atau dialihkan ke pengguna baru, kirim email notifikasi
    if (updatedCard.assignee?.email && updatedCard.assigneeId !== existingCard.assigneeId) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      sendTaskAssignedEmail(
        updatedCard.assignee.email,
        updatedCard.assignee.name,
        updatedCard.title,
        existingCard.list.board.title,
        updatedCard.priority,
        updatedCard.dueDate ? updatedCard.dueDate.toISOString() : null,
        clientUrl,
        req.user?.name
      ).catch((err) => console.error('Gagal mengirim email tugas pembaruan:', err));
    }

    res.json({ card: updatedCard });
  } catch (error) {
    console.error('updateCard error:', error);
    res.status(500).json({ error: 'Gagal memperbarui kartu' });
  }
};

export const deleteCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { card, member } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    if (member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat menghapus kartu' });
      return;
    }

    const boardId = card.list.boardId;

    await prisma.card.delete({
      where: { id: cardId },
    });

    await prisma.activityLog.create({
      data: {
        action: 'DELETED_CARD',
        details: `Menghapus kartu "${card.title}"`,
        entityType: 'CARD',
        entityId: cardId,
        boardId,
        workspaceId: card.list.board.workspaceId,
        userId,
      },
    });

    emitBoardUpdated(boardId, { type: 'CARD_DELETED', boardId, cardId, userId });

    res.json({ message: 'Kartu berhasil dihapus' });
  } catch (error) {
    console.error('deleteCard error:', error);
    res.status(500).json({ error: 'Gagal menghapus kartu' });
  }
};

/**
 * Algoritma Floating Point Indexing untuk memindahkan posisi kartu
 */
export const moveCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = moveCardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { targetListId, prevPosition, nextPosition } = parseResult.data;

    const { card, member: cardMember } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }

    const { list: targetList, member: targetMember } = await getUserListMembership(userId, targetListId);
    if (!targetList) {
      res.status(404).json({ error: 'Daftar tujuan tidak ditemukan' });
      return;
    }

    if (!cardMember || !targetMember) {
      res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki akses ke ruang kerja kartu ini' });
      return;
    }

    if (cardMember.role === 'VIEWER' || targetMember.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat memindahkan kartu' });
      return;
    }

    // Pastikan kartu dipindahkan dalam board yang sama
    if (card.list.boardId !== targetList.boardId) {
      res.status(400).json({ error: 'Kartu hanya dapat dipindahkan di dalam papan yang sama' });
      return;
    }

    // Hitung posisi baru dengan Floating Point Indexing
    let newPosition: number;
    const prev = prevPosition !== undefined && prevPosition !== null ? Number(prevPosition) : null;
    const next = nextPosition !== undefined && nextPosition !== null ? Number(nextPosition) : null;

    if (prev === null && next === null) {
      newPosition = 1000.0;
    } else if (prev !== null && next === null) {
      newPosition = prev + 1000.0;
    } else if (prev === null && next !== null) {
      newPosition = next / 2.0;
    } else {
      newPosition = (prev! + next!) / 2.0;
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        listId: targetListId,
        position: newPosition,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const boardId = targetList.boardId;

    const isListChanged = card.listId !== targetListId;
    const logDetails = isListChanged
      ? `Memindahkan kartu "${card.title}" dari "${card.list.title}" ke "${targetList.title}"`
      : `Menata ulang urutan kartu "${card.title}" di dalam "${targetList.title}"`;

    await prisma.activityLog.create({
      data: {
        action: 'MOVED_CARD',
        details: logDetails,
        entityType: 'CARD',
        entityId: cardId,
        boardId,
        workspaceId: targetList.board.workspaceId,
        userId,
      },
    });

    // Pancarkan Socket.io event ke room boardId
    emitBoardUpdated(boardId, {
      type: 'CARD_MOVED',
      boardId,
      cardId,
      targetListId,
      newPosition,
      userId,
    });

    res.json({
      message: 'Posisi kartu berhasil dipindahkan',
      card: updatedCard,
      newPosition,
    });
  } catch (error) {
    console.error('moveCard error:', error);
    res.status(500).json({ error: 'Gagal memindahkan kartu' });
  }
};

// =================== SUBTASK CONTROLLERS ===================

const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, 'Judul sub-tugas tidak boleh kosong'),
});

export const createSubtask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { card, member } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }
    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Tidak dapat menambah sub-tugas' });
      return;
    }

    const parseResult = createSubtaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const highest = await prisma.subtask.findFirst({
      where: { cardId },
      orderBy: { position: 'desc' },
    });
    const position = highest ? highest.position + 1000 : 1000;

    const subtask = await prisma.subtask.create({
      data: {
        title: parseResult.data.title,
        cardId,
        position,
      },
    });

    emitBoardUpdated(card.list.boardId, {
      type: 'SUBTASK_CREATED',
      boardId: card.list.boardId,
      cardId,
      subtaskId: subtask.id,
      userId,
    });

    res.status(201).json({ subtask });
  } catch (error) {
    console.error('createSubtask error:', error);
    res.status(500).json({ error: 'Gagal membuat sub-tugas' });
  }
};

const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
});

export const updateSubtask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subtaskId = req.params.subtaskId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        card: {
          include: {
            list: { include: { board: true } },
          },
        },
      },
    });

    if (!subtask) {
      res.status(404).json({ error: 'Sub-tugas tidak ditemukan' });
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: subtask.card.list.board.workspaceId,
        },
      },
    });

    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Tidak dapat memperbarui sub-tugas' });
      return;
    }

    const parseResult = updateSubtaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: parseResult.data,
    });

    emitBoardUpdated(subtask.card.list.boardId, {
      type: 'SUBTASK_UPDATED',
      boardId: subtask.card.list.boardId,
      cardId: subtask.cardId,
      subtaskId: updated.id,
      userId,
    });

    res.json({ subtask: updated });
  } catch (error) {
    console.error('updateSubtask error:', error);
    res.status(500).json({ error: 'Gagal memperbarui sub-tugas' });
  }
};

export const deleteSubtask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subtaskId = req.params.subtaskId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        card: {
          include: { list: { include: { board: true } } },
        },
      },
    });

    if (!subtask) {
      res.status(404).json({ error: 'Sub-tugas tidak ditemukan' });
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: subtask.card.list.board.workspaceId,
        },
      },
    });

    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Tidak dapat menghapus sub-tugas' });
      return;
    }

    await prisma.subtask.delete({ where: { id: subtaskId } });

    emitBoardUpdated(subtask.card.list.boardId, {
      type: 'SUBTASK_DELETED',
      boardId: subtask.card.list.boardId,
      cardId: subtask.cardId,
      subtaskId,
      userId,
    });

    res.json({ message: 'Sub-tugas berhasil dihapus' });
  } catch (error) {
    console.error('deleteSubtask error:', error);
    res.status(500).json({ error: 'Gagal menghapus sub-tugas' });
  }
};

// =================== LABEL CONTROLLERS ===================

const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Nama label tidak boleh kosong'),
  color: z.string().trim().min(1, 'Warna label diperlukan'),
});

export const createLabel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { card, member } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }
    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak' });
      return;
    }

    const parseResult = createLabelSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const label = await prisma.label.create({
      data: {
        name: parseResult.data.name,
        color: parseResult.data.color,
        cardId,
      },
    });

    emitBoardUpdated(card.list.boardId, {
      type: 'LABEL_CREATED',
      boardId: card.list.boardId,
      cardId,
      labelId: label.id,
      userId,
    });

    res.status(201).json({ label });
  } catch (error) {
    console.error('createLabel error:', error);
    res.status(500).json({ error: 'Gagal menambahkan label' });
  }
};

export const deleteLabel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const labelId = req.params.labelId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: {
        card: { include: { list: { include: { board: true } } } },
      },
    });

    if (!label) {
      res.status(404).json({ error: 'Label tidak ditemukan' });
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: label.card.list.board.workspaceId,
        },
      },
    });

    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak' });
      return;
    }

    await prisma.label.delete({ where: { id: labelId } });

    emitBoardUpdated(label.card.list.boardId, {
      type: 'LABEL_DELETED',
      boardId: label.card.list.boardId,
      cardId: label.cardId,
      labelId,
      userId,
    });

    res.json({ message: 'Label berhasil dihapus' });
  } catch (error) {
    console.error('deleteLabel error:', error);
    res.status(500).json({ error: 'Gagal menghapus label' });
  }
};

// =================== ATTACHMENT CONTROLLERS ===================

const createAttachmentSchema = z.object({
  name: z.string().trim().min(1, 'Nama lampiran tidak boleh kosong'),
  url: z.string().trim().min(1, 'Tautan lampiran tidak boleh kosong'),
  type: z.string().optional(),
  size: z.number().optional(),
});

export const createAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { card, member } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }
    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak' });
      return;
    }

    const parseResult = createAttachmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const attachment = await prisma.attachment.create({
      data: {
        name: parseResult.data.name,
        url: parseResult.data.url,
        type: parseResult.data.type || 'link',
        size: parseResult.data.size || null,
        cardId,
      },
    });

    emitBoardUpdated(card.list.boardId, {
      type: 'ATTACHMENT_CREATED',
      boardId: card.list.boardId,
      cardId,
      attachmentId: attachment.id,
      userId,
    });

    res.status(201).json({ attachment });
  } catch (error) {
    console.error('createAttachment error:', error);
    res.status(500).json({ error: 'Gagal menambahkan lampiran' });
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { card, member } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }
    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Tidak dapat mengunggah file' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Tidak ada file yang dipilih untuk diunggah' });
      return;
    }

    // Bangun URL publik file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        name: req.file.originalname,
        url: fileUrl,
        type: req.file.mimetype,
        size: req.file.size,
        cardId,
      },
    });

    emitBoardUpdated(card.list.boardId, {
      type: 'ATTACHMENT_CREATED',
      boardId: card.list.boardId,
      cardId,
      attachmentId: attachment.id,
      userId,
    });

    res.status(201).json({ attachment });
  } catch (error) {
    console.error('uploadAttachment error:', error);
    res.status(500).json({ error: 'Gagal mengunggah lampiran file' });
  }
};

export const deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const attachmentId = req.params.attachmentId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        card: { include: { list: { include: { board: true } } } },
      },
    });

    if (!attachment) {
      res.status(404).json({ error: 'Lampiran tidak ditemukan' });
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: attachment.card.list.board.workspaceId,
        },
      },
    });

    if (!member || member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak' });
      return;
    }

    // Jika file tersimpan lokal di /uploads/, hapus juga file fisiknya
    if (attachment.url.includes('/uploads/')) {
      const fileName = attachment.url.split('/uploads/').pop();
      if (fileName) {
        const filePath = path.join(process.cwd(), 'uploads', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
      }
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });

    emitBoardUpdated(attachment.card.list.boardId, {
      type: 'ATTACHMENT_DELETED',
      boardId: attachment.card.list.boardId,
      cardId: attachment.cardId,
      attachmentId,
      userId,
    });

    res.json({ message: 'Lampiran berhasil dihapus' });
  } catch (error) {
    console.error('deleteAttachment error:', error);
    res.status(500).json({ error: 'Gagal menghapus lampiran' });
  }
};


