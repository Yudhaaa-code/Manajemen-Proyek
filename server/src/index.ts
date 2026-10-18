import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

import { initSocket } from './lib/socket';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import boardRoutes from './routes/board.routes';
import listRoutes from './routes/list.routes';
import cardRoutes from './routes/card.routes';
import commentRoutes from './routes/comment.routes';

const app = express();
const server = http.createServer(app);

// Inisialisasi Socket.io aman
initSocket(server);

// 1. HTTP Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Diperlukan jika API menyajikan atau berintegrasi dengan frontend client
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Strict CORS Configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin || origin === 'http://localhost:5173') {
        callback(null, true);
      } else {
        callback(new Error('Akses ditolak oleh kebijakan CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Batasi ukuran body JSON untuk mencegah serangan DoS memori
app.use(express.json({ limit: '1mb' }));

// Layani file upload secara statis dengan header cross-origin
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.path.toLowerCase().endsWith('.jfif')) {
      res.type('image/jpeg');
    }
    next();
  },
  express.static(path.join(process.cwd(), 'uploads'))
);

// 4. Rate Limiting: Melindungi API dari spam & brute force
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 600, // 600 permintaan per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // Maks 30 percobaan autentikasi per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan autentikasi. Silakan tunggu 15 menit lagi.' },
});

app.use('/api', generalLimiter);

// 5. Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/comments', commentRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Linear & Trello Project Management API is running securely',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler untuk menyembunyikan stack trace internal
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: err.message || 'Terjadi kesalahan pada server internal',
    ...(isDev ? { stack: err.stack } : {}),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`⚡ Socket.io real-time server siap menerima koneksi (Aman)`);
});
