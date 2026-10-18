import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { emitBoardUpdated } from '../lib/socket';
import { getUserCardMembership } from '../lib/permissions';

const addCommentSchema = z.object({
  content: z.string().trim().min(1, 'Isi komentar tidak boleh kosong'),
});

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = addCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { content } = parseResult.data;

    const { card, member } = await getUserCardMembership(userId, cardId);
    if (!card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan' });
      return;
    }

    if (!member) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota ruang kerja kartu ini' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        cardId,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const boardId = card.list.boardId;

    // Catat ke ActivityLog
    await prisma.activityLog.create({
      data: {
        action: 'ADDED_COMMENT',
        details: `Menambahkan komentar pada kartu "${card.title}": "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`,
        entityType: 'CARD',
        entityId: cardId,
        boardId,
        workspaceId: card.list.board.workspaceId,
        userId,
      },
    });

    emitBoardUpdated(boardId, {
      type: 'COMMENT_ADDED',
      boardId,
      cardId,
      commentId: comment.id,
      userId,
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ error: 'Gagal menambahkan komentar' });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.commentId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        card: {
          include: {
            list: {
              include: {
                board: {
                  include: {
                    workspace: {
                      include: {
                        members: {
                          where: { userId },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      res.status(404).json({ error: 'Komentar tidak ditemukan' });
      return;
    }

    const userMembership = comment.card.list.board.workspace.members[0];
    const isAuthor = comment.userId === userId;
    const isAdmin = userMembership?.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      res.status(403).json({ error: 'Hanya penulis atau Admin ruang kerja yang dapat menghapus komentar ini' });
      return;
    }

    const boardId = comment.card.list.boardId;

    await prisma.comment.delete({
      where: { id: commentId },
    });

    emitBoardUpdated(boardId, {
      type: 'COMMENT_DELETED',
      boardId,
      cardId: comment.cardId,
      commentId,
      userId,
    });

    res.json({ message: 'Komentar berhasil dihapus' });
  } catch (error) {
    console.error('deleteComment error:', error);
    res.status(500).json({ error: 'Gagal menghapus komentar' });
  }
};
