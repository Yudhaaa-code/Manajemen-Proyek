export type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: Role;
  userId: string;
  workspaceId: string;
  user: User;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  userRole?: Role;
  createdAt: string;
  updatedAt: string;
  members?: WorkspaceMember[];
  boards?: Board[];
}

export interface Comment {
  id: string;
  content: string;
  cardId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  cardId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  cardId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: string | null;
  size?: number | null;
  cardId: string;
  createdAt: string;
}

export interface Card {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  priority: Priority;
  dueDate?: string | null;
  listId: string;
  assigneeId?: string | null;
  assignee?: User | null;
  comments?: Comment[];
  subtasks?: Subtask[];
  labels?: Label[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  title: string;
  position: number;
  boardId: string;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  title: string;
  description?: string | null;
  workspaceId: string;
  lists?: List[];
  workspace?: {
    id: string;
    name: string;
    members: WorkspaceMember[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: string | null;
  entityType: string;
  entityId: string;
  boardId?: string | null;
  workspaceId?: string | null;
  userId: string;
  user: User;
  createdAt: string;
}
