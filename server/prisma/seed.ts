import { PrismaClient, Role, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database...');

  // Bersihkan data jika ada sebelumnya
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.card.deleteMany();
  await prisma.list.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // 1. Buat Demo Admin
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'demo@linear.app',
      name: 'Demo Administrator',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  // Buat secondary user untuk simulasi kolaborator
  const memberUser = await prisma.user.create({
    data: {
      email: 'sarah.engineer@linear.app',
      name: 'Sarah Connor (Senior Dev)',
      password: hashedPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log('✅ Pengguna demo berhasil dibuat');

  // 2. Buat 1 Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Linear Engineering',
      description: 'Ruang kerja tim inti untuk rekayasa perangkat lunak dan manajemen sprint',
      inviteCode: 'LINEAR-DEV-2025',
      members: {
        create: [
          {
            userId: adminUser.id,
            role: Role.ADMIN,
          },
          {
            userId: memberUser.id,
            role: Role.MEMBER,
          },
        ],
      },
    },
  });

  console.log('✅ Workspace "Linear Engineering" berhasil dibuat');

  // 3. Buat 1 Board
  const board = await prisma.board.create({
    data: {
      title: 'Product Roadmap & Sprint 24',
      description: 'Papan Kanban aktif untuk pelacakan rilis Q4 dan fitur kolaborasi tim',
      workspaceId: workspace.id,
    },
  });

  console.log('✅ Board dibuat');

  // 4. Buat 3 Lists (To Do, In Progress, Done)
  const todoList = await prisma.list.create({
    data: {
      title: 'To Do',
      position: 1000,
      boardId: board.id,
    },
  });

  const inProgressList = await prisma.list.create({
    data: {
      title: 'In Progress',
      position: 2000,
      boardId: board.id,
    },
  });

  const doneList = await prisma.list.create({
    data: {
      title: 'Done',
      position: 3000,
      boardId: board.id,
    },
  });

  console.log('✅ 3 Lists berhasil dibuat: To Do, In Progress, Done');

  // 5. Buat 5 Cards contoh
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const card1 = await prisma.card.create({
    data: {
      title: 'Implementasi Floating Point Indexing',
      description: 'Gunakan algoritma floating point indexing untuk penyisipan kartu tanpa re-indexing massal di database. Pastikan perhitungan (prev + next) / 2 bekerja sempurna.',
      position: 1000,
      priority: Priority.HIGH,
      dueDate: threeDaysLater,
      listId: todoList.id,
      assigneeId: adminUser.id,
    },
  });

  const card2 = await prisma.card.create({
    data: {
      title: 'Audit Keamanan REST API & RBAC',
      description: 'Validasi token JWT dan otorisasi role (ADMIN, MEMBER, VIEWER) di setiap endpoint workspace dan board.',
      position: 2000,
      priority: Priority.MEDIUM,
      dueDate: fiveDaysLater,
      listId: todoList.id,
      assigneeId: memberUser.id,
    },
  });

  const card3 = await prisma.card.create({
    data: {
      title: 'Desain Sistem Linear & Notion UI',
      description: 'Gunakan palet warna Slate/Indigo, tipografi Inter, dan border tipis border-slate-200 dengan efek glassmorphism backdrop-blur.',
      position: 1000,
      priority: Priority.URGENT,
      dueDate: oneDayLater,
      listId: inProgressList.id,
      assigneeId: adminUser.id,
    },
  });

  const card4 = await prisma.card.create({
    data: {
      title: 'Sinkronisasi Real-time Socket.io',
      description: 'Integrasi room per boardId dengan event board-updated untuk auto-invalidate React Query cache saat kolaborator lain menggeser kartu.',
      position: 2000,
      priority: Priority.HIGH,
      dueDate: twoDaysLater,
      listId: inProgressList.id,
      assigneeId: memberUser.id,
    },
  });

  const card5 = await prisma.card.create({
    data: {
      title: 'Inisialisasi Monorepo & Skema Prisma PostgreSQL',
      description: 'Konfigurasi Prisma ORM dengan connection pooler Supabase dan direktori /client serta /server berstandar produksi.',
      position: 1000,
      priority: Priority.LOW,
      dueDate: yesterday,
      listId: doneList.id,
      assigneeId: adminUser.id,
    },
  });

  // Tambahkan beberapa komentar
  await prisma.comment.create({
    data: {
      content: 'Algoritma floating point index sudah dites dan siap diintegrasikan dengan drag and drop frontend.',
      cardId: card1.id,
      userId: memberUser.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Mantap! Jangan lupa catat ke ActivityLog setiap perpindahan kartu.',
      cardId: card1.id,
      userId: adminUser.id,
    },
  });

  // Tambahkan initial activity log
  await prisma.activityLog.create({
    data: {
      action: 'CREATED_BOARD',
      details: 'Membuat board baru: Product Roadmap & Sprint 24',
      entityType: 'BOARD',
      entityId: board.id,
      boardId: board.id,
      workspaceId: workspace.id,
      userId: adminUser.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'CREATED_CARD',
      details: 'Menambahkan kartu baru "Implementasi Floating Point Indexing" ke daftar To Do',
      entityType: 'CARD',
      entityId: card1.id,
      boardId: board.id,
      workspaceId: workspace.id,
      userId: adminUser.id,
    },
  });

  console.log('✅ Seeding selesai! Database siap digunakan.');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menjalankan seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
