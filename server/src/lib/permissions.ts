import { Role } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Memeriksa apakah user memiliki akses ke Workspace tertentu
 */
export async function getUserWorkspaceMembership(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  return member;
}

/**
 * Memeriksa apakah user memiliki akses ke Board tertentu
 */
export async function getUserBoardMembership(userId: string, boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      title: true,
      workspaceId: true,
      workspace: {
        select: {
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!board) return { board: null, member: null };
  const member = board.workspace.members[0] || null;
  return { board, member };
}

/**
 * Memeriksa apakah user memiliki akses ke List tertentu
 */
export async function getUserListMembership(userId: string, listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      id: true,
      title: true,
      boardId: true,
      board: {
        select: {
          id: true,
          title: true,
          workspaceId: true,
          workspace: {
            select: {
              members: {
                where: { userId },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!list) return { list: null, member: null };
  const member = list.board.workspace.members[0] || null;
  return { list, member };
}

/**
 * Memeriksa apakah user memiliki akses ke Card tertentu
 */
export async function getUserCardMembership(userId: string, cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      title: true,
      listId: true,
      assigneeId: true,
      list: {
        select: {
          id: true,
          title: true,
          boardId: true,
          board: {
            select: {
              id: true,
              title: true,
              workspaceId: true,
              workspace: {
                select: {
                  members: {
                    where: { userId },
                    select: { role: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return { card: null, member: null };
  const member = card.list.board.workspace.members[0] || null;
  return { card, member };
}
