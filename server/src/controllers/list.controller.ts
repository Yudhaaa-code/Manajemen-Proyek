import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { emitBoardUpdated } from '../lib/socket';
import { getUserBoardMembership, getUserListMembership } from '../lib/permissions';

const createListSchema = z.object({
  title: z.string().min(1, 'Judul daftar minimal 1 karakter'),
  boardId: z.string().min(1, 'Board ID diperlukan'),
  position: z.number().optional(),
});

const updateListSchema = z.object({
  title: z.string().min(1, 'Judul daftar minimal 1 karakter').optional(),
  position: z.number().optional(),
});

export const createList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = createListSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { title, boardId } = parseResult.data;

    const { board, member } = await getUserBoardMembership(userId, boardId);
    if (!board) {
      res.status(404).json({ error: 'Papan kerja (Board) tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    if (member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat membuat daftar baru' });
      return;
    }

    let position = parseResult.data.position;
    if (position === undefined) {
      const highestList = await prisma.list.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
      });
      position = highestList ? highestList.position + 1000 : 1000;
    }

    const list = await prisma.list.create({
      data: {
        title,
        boardId,
        position,
      },
      include: {
        cards: true,
      },
    });

    // Catat ke ActivityLog
    await prisma.activityLog.create({
      data: {
        action: 'CREATED_LIST',
        details: `Membuat kolom daftar baru "${title}"`,
        entityType: 'LIST',
        entityId: list.id,
        boardId,
        workspaceId: board.workspaceId,
        userId,
      },
    });

    emitBoardUpdated(boardId, { type: 'LIST_CREATED', boardId, listId: list.id, userId });

    res.status(201).json({ list });
  } catch (error) {
    console.error('createList error:', error);
    res.status(500).json({ error: 'Gagal membuat daftar (list)' });
  }
};

export const updateList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listId = req.params.listId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { list: existingList, member } = await getUserListMembership(userId, listId);
    if (!existingList) {
      res.status(404).json({ error: 'Daftar (list) tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    if (member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat mengubah daftar' });
      return;
    }

    const parseResult = updateListSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const list = await prisma.list.update({
      where: { id: listId },
      data: parseResult.data,
      include: {
        board: true,
      },
    });

    emitBoardUpdated(list.boardId, { type: 'LIST_UPDATED', boardId: list.boardId, listId: list.id, userId });

    res.json({ list });
  } catch (error) {
    console.error('updateList error:', error);
    res.status(500).json({ error: 'Gagal memperbarui daftar' });
  }
};

export const deleteList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listId = req.params.listId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

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
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat menghapus daftar' });
      return;
    }

    const boardId = list.boardId;

    await prisma.list.delete({
      where: { id: listId },
    });

    await prisma.activityLog.create({
      data: {
        action: 'DELETED_LIST',
        details: `Menghapus kolom daftar "${list.title}"`,
        entityType: 'LIST',
        entityId: listId,
        boardId,
        workspaceId: list.board.workspaceId,
        userId,
      },
    });

    emitBoardUpdated(boardId, { type: 'LIST_DELETED', boardId, listId, userId });

    res.json({ message: 'Daftar berhasil dihapus' });
  } catch (error) {
    console.error('deleteList error:', error);
    res.status(500).json({ error: 'Gagal menghapus daftar' });
  }
};
