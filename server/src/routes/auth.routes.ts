import { Router } from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  demoLogin,
  getMe,
} from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Endpoint Pendaftaran & Login
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.post('/google', googleAuth);

// Endpoint Reset Kata Sandi
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Profil
router.get('/me', authenticateJWT, getMe);

export default router;
