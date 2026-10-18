import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';

export interface WorkspaceAuthRequest extends AuthRequest {
  workspaceMember?: {
    role: Role;
    workspaceId: string;
  };
}

export const requireWorkspaceRole = (allowedRoles: Role[]) => {
  return async (req: WorkspaceAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Tidak terotentikasi' });
        return;
      }

      let workspaceId = (req.params.workspaceId as string) || req.body.workspaceId;

      // Jika tidak ada workspaceId langsung, cek dari boardId
      if (!workspaceId && req.params.boardId) {
        const board = await prisma.board.findUnique({
          where: { id: req.params.boardId as string },
          select: { workspaceId: true },
        });
        if (board) {
          workspaceId = board.workspaceId;
        }
      }

      if (!workspaceId) {
        res.status(400).json({ error: 'Workspace ID diperlukan untuk verifikasi peran' });
        return;
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      if (!member) {
        res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace ini' });
        return;
      }

      if (!allowedRoles.includes(member.role)) {
        res.status(403).json({
          error: `Akses ditolak: Peran Anda (${member.role}) tidak memiliki izin untuk aksi ini`,
        });
        return;
      }

      req.workspaceMember = {
        role: member.role,
        workspaceId,
      };

      next();
    } catch (error) {
      console.error('RBAC Error:', error);
      res.status(500).json({ error: 'Terjadi kesalahan saat memeriksa izin pengguna' });
    }
  };
};
