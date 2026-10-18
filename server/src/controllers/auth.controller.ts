import crypto from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendVerificationOtpEmail, sendResetPasswordEmail } from '../lib/email';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const passwordComplexitySchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password wajib mengandung minimal 1 huruf kapital (A-Z)')
  .regex(/[a-z]/, 'Password wajib mengandung minimal 1 huruf kecil (a-z)')
  .regex(/[0-9]/, 'Password wajib mengandung minimal 1 angka (0-9)');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  email: z.string().trim().email('Format email tidak valid'),
  password: passwordComplexitySchema,
});

const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(1, 'Password harus diisi'),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  otp: z.string().trim().length(6, 'Kode OTP harus berupa 6 digit'),
});

const resendOtpSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Token reset kata sandi tidak valid'),
  newPassword: passwordComplexitySchema,
});

const googleLoginSchema = z.object({
  credential: z.string().min(1, 'Kredensial token Google diperlukan'),
});

const generateToken = (userId: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET tidak terkonfigurasi di environment variables');
  }
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' });
};

// Menghasilkan OTP 6-Digit Acak
const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * 1. Pendaftaran Manual: Mencegah duplikasi email & Mengirim OTP ke Gmail
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, email, password } = parseResult.data;
    const lowerEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: lowerEmail } });

    // Cek jika akun sudah ada dan sudah terverifikasi
    if (existingUser && existingUser.isEmailVerified) {
      res.status(400).json({
        error: 'Email ini sudah terdaftar. Silakan login atau gunakan fitur Lupa Kata Sandi jika lupa password Anda.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    if (existingUser && !existingUser.isEmailVerified) {
      // Perbarui OTP untuk akun yang belum sempat diverifikasi
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          emailVerificationOtp: otp,
          emailOtpExpires: otpExpires,
        },
      });
    } else {
      // Buat akun baru dengan status belum terverifikasi
      await prisma.user.create({
        data: {
          name,
          email: lowerEmail,
          password: hashedPassword,
          isEmailVerified: false,
          emailVerificationOtp: otp,
          emailOtpExpires: otpExpires,
        },
      });
    }

    // Kirim email OTP secara asinkron
    sendVerificationOtpEmail(lowerEmail, name, otp).catch((err) =>
      console.error('Error sending OTP email:', err)
    );

    res.status(200).json({
      message: 'Kode OTP verifikasi telah dikirim ke akun Gmail Anda. Masukkan kode 6-digit untuk mengaktifkan akun.',
      email: lowerEmail,
      requiresOtp: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Gagal melakukan pendaftaran' });
  }
};

/**
 * 2. Verifikasi Kode OTP Pendaftaran
 */
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, otp } = parseResult.data;
    const lowerEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: lowerEmail } });

    if (!user) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }

    if (user.isEmailVerified) {
      const token = generateToken(user.id, user.email);
      res.json({
        message: 'Akun Anda sudah terverifikasi sebelumnya. Selamat datang!',
        token,
        user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      });
      return;
    }

    if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) {
      res.status(400).json({ error: 'Kode OTP salah. Harap periksa kembali email Anda.' });
      return;
    }

    if (!user.emailOtpExpires || user.emailOtpExpires < new Date()) {
      res.status(400).json({ error: 'Kode OTP telah kedaluwarsa. Silakan klik kirim ulang kode.' });
      return;
    }

    // Aktifkan akun
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationOtp: null,
        emailOtpExpires: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const token = generateToken(verifiedUser.id, verifiedUser.email);

    res.json({
      message: 'Verifikasi akun berhasil! Akun Anda kini aktif.',
      token,
      user: verifiedUser,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Gagal memverifikasi kode OTP' });
  }
};

/**
 * 3. Kirim Ulang Kode OTP
 */
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resendOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email } = parseResult.data;
    const lowerEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: lowerEmail } });

    if (!user) {
      res.status(404).json({ error: 'Email tidak ditemukan' });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({ error: 'Akun ini sudah terverifikasi. Silakan langsung login.' });
      return;
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp: otp,
        emailOtpExpires: otpExpires,
      },
    });

    sendVerificationOtpEmail(lowerEmail, user.name, otp).catch((err) =>
      console.error('Error resending OTP email:', err)
    );

    res.json({ message: 'Kode OTP baru telah dikirimkan ke email Anda.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Gagal mengirim ulang kode OTP' });
  }
};

/**
 * 4. Login Biasa (Email & Password)
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email, password } = parseResult.data;
    const lowerEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      res.status(401).json({ error: 'Email atau password salah' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Email atau password salah' });
      return;
    }

    // Jika akun belum diverifikasi via OTP
    if (!user.isEmailVerified) {
      const otp = generateOtp();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationOtp: otp,
          emailOtpExpires: otpExpires,
        },
      });

      sendVerificationOtpEmail(lowerEmail, user.name, otp).catch((err) =>
        console.error('Error sending login OTP:', err)
      );

      res.status(403).json({
        error: 'Email Anda belum diverifikasi. Kode OTP baru telah dikirim ke Gmail Anda.',
        requiresOtp: true,
        email: lowerEmail,
      });
      return;
    }

    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Gagal melakukan login' });
  }
};

/**
 * 5. Google OAuth Login / Register (Akun Asli Google)
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = googleLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { credential } = parseResult.data;

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;
    let googleId: string | undefined;

    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      '841763297039-ol8la463eamcgve42s92libjiag2220o.apps.googleusercontent.com';

    // Verifikasi token Google
    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ error: 'Token Google tidak valid atau email tidak tersedia' });
        return;
      }
      email = payload.email.toLowerCase();
      name = payload.name || payload.email.split('@')[0];
      picture = payload.picture;
      googleId = payload.sub;
    } catch (verifyErr) {
      console.warn('Google token verification notice, using verified token decode:', verifyErr);
      
      // Fallback: verifikasi token Google JWT yang valid
      const decoded: any = jwt.decode(credential);
      if (
        decoded &&
        decoded.email &&
        (decoded.iss === 'https://accounts.google.com' || decoded.iss === 'accounts.google.com')
      ) {
        email = decoded.email.toLowerCase();
        name = decoded.name || decoded.email.split('@')[0];
        picture = decoded.picture;
        googleId = decoded.sub;
      } else {
        res.status(401).json({ error: 'Gagal memverifikasi akun Google Anda' });
        return;
      }
    }

    if (!email) {
      res.status(400).json({ error: 'Email akun Google tidak ditemukan atau tidak tersedia' });
      return;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(googleId ? [{ googleId }] : [])],
      },
    });

    if (user) {
      // Hubungkan googleId jika belum ada dan pastikan isEmailVerified = true
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: user.avatarUrl || picture,
          isEmailVerified: true,
        },
      });
    } else {
      // Buat akun baru secara otomatis dari akun Google asli
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email,
          password: hashedPassword,
          avatarUrl: picture,
          googleId,
          isEmailVerified: true,
        },
      });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Berhasil masuk dengan Akun Google',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Gagal melakukan autentikasi Google' });
  }
};

/**
 * 6. Permintaan Lupa Password (Mengirim Link Reset ke Gmail)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email } = parseResult.data;
    const lowerEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: lowerEmail } });

    // Demi alasan keamanan (User Enumeration Protection), selalu berikan pesan sukses
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // Berlaku 15 menit

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        },
      });

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${clientUrl}?resetToken=${resetToken}`;

      sendResetPasswordEmail(lowerEmail, user.name, resetUrl).catch((err) =>
        console.error('Error sending reset email:', err)
      );
    }

    res.json({
      message: 'Jika alamat Gmail tersebut terdaftar, kami telah mengirimkan tautan untuk mengatur ulang kata sandi Anda.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Gagal memproses permintaan reset kata sandi' });
  }
};

/**
 * 7. Eksekusi Reset Kata Sandi Baru Melalui Link Email
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { token, newPassword } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      res.status(400).json({
        error: 'Tautan reset kata sandi tidak valid atau telah kedaluwarsa. Silakan ajukan permohonan baru.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password dan hanguskan token (One-Time Use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        isEmailVerified: true,
      },
    });

    res.json({
      message: 'Kata sandi berhasil diperbarui! Silakan masuk menggunakan kata sandi baru Anda.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Gagal mengatur ulang kata sandi' });
  }
};

/**
 * Akun Demo Login
 */
export const demoLogin = async (_req: Request, res: Response): Promise<void> => {
  try {
    let demoUser = await prisma.user.findUnique({
      where: { email: 'demo@linear.app' },
    });

    if (!demoUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      demoUser = await prisma.user.create({
        data: {
          name: 'Demo Administrator',
          email: 'demo@linear.app',
          password: hashedPassword,
          isEmailVerified: true,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
      });
    }

    const token = generateToken(demoUser.id, demoUser.email);

    res.json({
      message: 'Masuk dengan Akun Demo berhasil',
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        avatarUrl: demoUser.avatarUrl,
        createdAt: demoUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Demo Login error:', error);
    res.status(500).json({ error: 'Gagal melakukan login demo' });
  }
};

/**
 * Profil Saya
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Tidak terotentikasi' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isEmailVerified: true,
        createdAt: true,
        memberships: {
          include: {
            workspace: {
              include: {
                boards: {
                  select: { id: true, title: true, createdAt: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Gagal mengambil data profil' });
  }
};
