import crypto from 'crypto';
import { Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendWorkspaceInviteEmail } from '../lib/email';

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Nama ruang kerja minimal 2 karakter'),
  description: z.string().optional(),
});

const joinWorkspaceSchema = z.object({
  inviteCode: z.string().min(1, 'Kode undangan harus diisi'),
});

export const createWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = createWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, description } = parseResult.data;

    // Generate secure inviteCode
    const cleanPrefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'WS';
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const inviteCode = `${cleanPrefix}-${randomSuffix}`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        inviteCode,
        members: {
          create: {
            userId,
            role: Role.ADMIN,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        boards: true,
      },
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error('createWorkspace error:', error);
    res.status(500).json({ error: 'Gagal membuat workspace' });
  }
};

export const getUserWorkspaces = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            boards: {
              select: { id: true, title: true, description: true, createdAt: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      userRole: m.role,
    }));

    res.json({ workspaces });
  } catch (error) {
    console.error('getUserWorkspaces error:', error);
    res.status(500).json({ error: 'Gagal memuat daftar workspace' });
  }
};

export const getWorkspaceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user?.id;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        boards: {
          include: {
            _count: {
              select: { lists: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace tidak ditemukan' });
      return;
    }

    // Cek apakah user adalah member
    const membership = workspace.members.find((m: { userId: string }) => m.userId === userId);
    if (!membership) {
      res.status(403).json({ error: 'Akses ditolak: Anda bukan anggota workspace ini' });
      return;
    }

    res.json({
      workspace: {
        ...workspace,
        userRole: membership.role,
      },
    });
  } catch (error) {
    console.error('getWorkspaceById error:', error);
    res.status(500).json({ error: 'Gagal mengambil detail workspace' });
  }
};

export const joinWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = joinWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { inviteCode } = parseResult.data;

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Kode undangan workspace tidak valid' });
      return;
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: workspace.id,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'Anda sudah menjadi anggota di workspace ini' });
      return;
    }

    await prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: Role.MEMBER,
      },
    });

    res.json({
      message: 'Berhasil bergabung dengan ruang kerja!',
      workspaceId: workspace.id,
      name: workspace.name,
    });
  } catch (error) {
    console.error('joinWorkspace error:', error);
    res.status(500).json({ error: 'Gagal bergabung ke workspace' });
  }
};

const inviteMemberSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  role: z.nativeEnum(Role).optional().default(Role.MEMBER),
});

export const inviteMemberByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = inviteMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, role } = parseResult.data;

    // Pastikan user pengundang adalah ADMIN di workspace ini
    const inviterMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: { workspace: true, user: true },
    });

    if (!inviterMember || inviterMember.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Hanya Admin Workspace yang dapat mengirim undangan anggota' });
      return;
    }

    // Cek jika email sudah menjadi anggota
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: existingUser.id, workspaceId } },
      });
      if (alreadyMember) {
        res.status(400).json({ error: 'Pengguna dengan email ini sudah menjadi anggota ruang kerja' });
        return;
      }
    }

    // Buat / perbarui token invite di database (berlaku 7 hari)
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.workspaceInvite.create({
      data: {
        email,
        role,
        token,
        workspaceId,
        expiresAt,
      },
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteLink = `${clientUrl}?inviteToken=${token}`;

    const emailSent = await sendWorkspaceInviteEmail(
      email,
      inviterMember.workspace.name,
      inviterMember.user.name,
      inviteLink,
      role
    );

    res.json({
      message: emailSent
        ? `Undangan berhasil dikirim ke alamat ${email}`
        : `Undangan dibuat. Tautan: ${inviteLink}`,
      inviteLink,
    });
  } catch (error) {
    console.error('inviteMemberByEmail error:', error);
    res.status(500).json({ error: 'Gagal mengirim undangan anggota' });
  }
};

const joinByInviteTokenSchema = z.object({
  token: z.string().min(1, 'Token undangan diperlukan'),
});

export const joinWorkspaceByInviteToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = joinByInviteTokenSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { token } = parseResult.data;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invite || invite.expiresAt < new Date()) {
      res.status(400).json({ error: 'Tautan undangan tidak valid atau telah kedaluwarsa' });
      return;
    }

    // Cek apakah user sudah anggota
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    });

    if (existingMember) {
      res.json({
        message: 'Anda sudah menjadi anggota di workspace ini',
        workspaceId: invite.workspaceId,
        name: invite.workspace.name,
      });
      return;
    }

    await prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    });

    // Hapus invite setelah digunakan
    await prisma.workspaceInvite.delete({ where: { id: invite.id } }).catch(() => {});

    res.json({
      message: `Selamat datang di ruang kerja ${invite.workspace.name}!`,
      workspaceId: invite.workspaceId,
      name: invite.workspace.name,
    });
  } catch (error) {
    console.error('joinWorkspaceByInviteToken error:', error);
    res.status(500).json({ error: 'Gagal menerima undangan workspace' });
  }
};

const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const memberId = req.params.memberId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const parseResult = updateMemberRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { role } = parseResult.data;

    // Pastikan user yang mengubah adalah ADMIN
    const currentMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!currentMember || currentMember.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Hanya Admin yang dapat mengubah peran anggota' });
      return;
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({
      message: `Peran anggota berhasil diperbarui menjadi ${role}`,
      member: updated,
    });
  } catch (error) {
    console.error('updateMemberRole error:', error);
    res.status(500).json({ error: 'Gagal mengubah peran anggota' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const memberId = req.params.memberId as string;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const currentMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember) {
      res.status(404).json({ error: 'Anggota tidak ditemukan' });
      return;
    }

    // Bisa menghapus jika: User adalah Admin ATAU User menghapus dirinya sendiri (leave workspace)
    const isAdmin = currentMember?.role === Role.ADMIN;
    const isSelf = targetMember.userId === userId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin menghapus anggota ini' });
      return;
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    res.json({ message: 'Anggota berhasil dikeluarkan dari ruang kerja' });
  } catch (error) {
    console.error('removeMember error:', error);
    res.status(500).json({ error: 'Gagal menghapus anggota' });
  }
};

export const searchWorkspaceCards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.user?.id;
    const q = ((req.query.q as string) || '').trim();

    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Akses ditolak' });
      return;
    }

    const cards = await prisma.card.findMany({
      where: {
        list: {
          board: { workspaceId },
        },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { labels: { some: { name: { contains: q, mode: 'insensitive' } } } },
                { assignee: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        labels: true,
        subtasks: true,
        attachments: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        list: {
          include: {
            board: { select: { id: true, title: true } },
          },
        },
      },
      take: 30,
    });

    res.json({ cards });
  } catch (error) {
    console.error('searchWorkspaceCards error:', error);
    res.status(500).json({ error: 'Gagal mencari kartu di ruang kerja' });
  }
};


