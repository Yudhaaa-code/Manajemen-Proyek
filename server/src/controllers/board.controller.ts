import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { emitBoardUpdated } from '../lib/socket';
import { getUserBoardMembership } from '../lib/permissions';

const createBoardSchema = z.object({
  title: z.string().min(2, 'Judul papan minimal 2 karakter'),
  description: z.string().optional(),
  workspaceId: z.string().min(1, 'Workspace ID diperlukan'),
});

const updateBoardSchema = z.object({
  title: z.string().min(2, 'Judul papan minimal 2 karakter').optional(),
  description: z.string().optional(),
});

export const createBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = createBoardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { title, description, workspaceId } = parseResult.data;

    // Pastikan user adalah member workspace
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace ini' });
      return;
    }

    // Buat board dengan 3 list default (To Do, In Progress, Done)
    const board = await prisma.board.create({
      data: {
        title,
        description,
        workspaceId,
        lists: {
          create: [
            { title: 'To Do', position: 1000 },
            { title: 'In Progress', position: 2000 },
            { title: 'Done', position: 3000 },
          ],
        },
      },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: true,
          },
        },
      },
    });

    // Catat ke ActivityLog
    await prisma.activityLog.create({
      data: {
        action: 'CREATED_BOARD',
        details: `Membuat papan kerja baru "${title}"`,
        entityType: 'BOARD',
        entityId: board.id,
        boardId: board.id,
        workspaceId,
        userId,
      },
    });

    res.status(201).json({ board });
  } catch (error) {
    console.error('createBoard error:', error);
    res.status(500).json({ error: 'Gagal membuat board' });
  }
};

export const getBoardById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boardId = req.params.boardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
        },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                assignee: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
                comments: {
                  orderBy: { createdAt: 'desc' },
                  include: {
                    user: {
                      select: { id: true, name: true, avatarUrl: true },
                    },
                  },
                },
                subtasks: {
                  orderBy: { position: 'asc' },
                },
                labels: true,
                attachments: true,
              },
            },
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Papan kerja (Board) tidak ditemukan' });
      return;
    }

    // Pastikan user memiliki akses ke workspace board ini
    const isMember = board.workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki akses ke board ini' });
      return;
    }

    res.json({ board });
  } catch (error) {
    console.error('getBoardById error:', error);
    res.status(500).json({ error: 'Gagal memuat detail board' });
  }
};

export const updateBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boardId = req.params.boardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { board: existingBoard, member } = await getUserBoardMembership(userId, boardId);
    if (!existingBoard) {
      res.status(404).json({ error: 'Papan kerja (Board) tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    if (member.role === 'VIEWER') {
      res.status(403).json({ error: 'Akses ditolak: Peran VIEWER tidak dapat mengubah papan' });
      return;
    }

    const parseResult = updateBoardSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const board = await prisma.board.update({
      where: { id: boardId },
      data: parseResult.data,
    });

    emitBoardUpdated(boardId, { type: 'BOARD_UPDATED', boardId, userId });

    res.json({ board });
  } catch (error) {
    console.error('updateBoard error:', error);
    res.status(500).json({ error: 'Gagal memperbarui board' });
  }
};

export const deleteBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boardId = req.params.boardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { board: existingBoard, member } = await getUserBoardMembership(userId, boardId);
    if (!existingBoard) {
      res.status(404).json({ error: 'Papan kerja (Board) tidak ditemukan' });
      return;
    }

    if (!member || member.role !== 'ADMIN') {
      res.status(403).json({ error: 'Akses ditolak: Hanya Administrator workspace yang dapat menghapus papan' });
      return;
    }

    await prisma.board.delete({
      where: { id: boardId },
    });

    emitBoardUpdated(boardId, { type: 'BOARD_DELETED', boardId, userId });

    res.json({ message: 'Board berhasil dihapus' });
  } catch (error) {
    console.error('deleteBoard error:', error);
    res.status(500).json({ error: 'Gagal menghapus board' });
  }
};
