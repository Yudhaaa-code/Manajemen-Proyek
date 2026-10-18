import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { getUserBoardMembership } from '../lib/permissions';

export const getBoardActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boardId = req.params.boardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const { board, member } = await getUserBoardMembership(userId, boardId);
    if (!board) {
      res.status(404).json({ error: 'Papan kerja (Board) tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace papan ini' });
      return;
    }

    const activities = await prisma.activityLog.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    res.json({ activities });
  } catch (error) {
    console.error('getBoardActivities error:', error);
    res.status(500).json({ error: 'Gagal mengambil riwayat aktivitas' });
  }
};
