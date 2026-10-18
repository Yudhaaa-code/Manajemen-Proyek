import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getUserBoardMembership } from './permissions';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer) => {
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  // Middleware autentikasi token untuk setiap koneksi WebSocket
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('Autentikasi gagal: Token tidak disediakan'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Konfigurasi server JWT_SECRET belum disetel'));
      }

      const decoded = jwt.verify(token, secret) as { userId: string; email: string };
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      return next(new Error('Autentikasi gagal: Token tidak valid atau kedaluwarsa'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;

    socket.on('join-board', async (boardId: string) => {
      try {
        if (!userId || !boardId) return;

        // Validasi apakah user terotentikasi berhak mengakses papan ini
        const { board, member } = await getUserBoardMembership(userId, boardId);
        if (!board || !member) {
          socket.emit('error', {
            message: 'Akses ditolak: Anda bukan anggota workspace papan ini',
          });
          return;
        }

        socket.join(`board:${boardId}`);
      } catch (error) {
        console.error('Socket join-board error:', error);
      }
    });

    socket.on('leave-board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('disconnect', () => {
      // Disconnected gracefully
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io belum diinisialisasi!');
  }
  return io;
};

export const emitBoardUpdated = (boardId: string, payload: any) => {
  if (io) {
    io.to(`board:${boardId}`).emit('board-updated', payload);
  }
};
