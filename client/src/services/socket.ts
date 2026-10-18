import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  const token = localStorage.getItem('token');

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token,
      },
    });
  } else {
    socket.auth = { token };
    if (!socket.connected && token) {
      socket.connect();
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinBoard = (boardId: string) => {
  const s = getSocket();
  s.emit('join-board', boardId);
};

export const leaveBoard = (boardId: string) => {
  const s = getSocket();
  s.emit('leave-board', boardId);
};
