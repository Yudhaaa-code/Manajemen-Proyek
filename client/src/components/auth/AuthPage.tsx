import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import {
  Kanban,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  KeyRound,
  CheckCircle2,
  Lock,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Info,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

type AuthView = 'LOGIN' | 'REGISTER' | 'VERIFY_OTP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

// Badge & Live Checklist Kriteria Kata Sandi
const PasswordCriteriaBadge: React.FC<{
  criteria: { minChars: boolean; hasUpper: boolean; hasLower: boolean; hasNumber: boolean };
  value: string;
}> = ({ criteria, value }) => {
  if (!value) return null;

  const items = [
    { label: 'Minimal 8 karakter', valid: criteria.minChars },
    { label: 'Minimal 1 huruf kapital (A-Z)', valid: criteria.hasUpper },
    { label: 'Minimal 1 huruf kecil (a-z)', valid: criteria.hasLower },
    { label: 'Minimal 1 angka (0-9)', valid: criteria.hasNumber },
  ];

  const validCount = items.filter((i) => i.valid).length;
  const strengthLevels = [
    { label: 'Sangat Lemah', barColor: 'bg-red-500', textColor: 'text-red-500' },
    { label: 'Kurang', barColor: 'bg-red-400', textColor: 'text-red-500' },
    { label: 'Cukup', barColor: 'bg-amber-500', textColor: 'text-amber-600' },
    { label: 'Kuat', barColor: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Sangat Kuat & Aman', barColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
  ];
  const currentStrength = strengthLevels[validCount];

  return (
    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-500">Kekuatan Kata Sandi:</span>
        <span className={`font-semibold ${currentStrength.textColor}`}>{currentStrength.label}</span>
      </div>

      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-1">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full flex-1 rounded-full transition-all duration-300 ${
              validCount >= step ? currentStrength.barColor : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              item.valid ? 'text-emerald-700 font-medium' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                item.valid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AuthPage: React.FC = () => {
  const [view, setView] = useState<AuthView>('LOGIN');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();

  // Kriteria password kuat (minimal 8 karakter, ada kapital, huruf kecil, dan angka)
  const getPasswordCriteria = (pwd: string) => ({
    minChars: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
  });

  const registerPwdCriteria = getPasswordCriteria(password);
  const resetPwdCriteria = getPasswordCriteria(newPassword);

  const checkIsPasswordValid = (criteria: ReturnType<typeof getPasswordCriteria>) =>
    criteria.minChars && criteria.hasUpper && criteria.hasLower && criteria.hasNumber;

  // Sinkronkan otpDigits array ke string otp
  useEffect(() => {
    setOtp(otpDigits.join(''));
  }, [otpDigits]);

  // Auto focus input pertama saat membuka tampilan OTP
  useEffect(() => {
    if (view === 'VERIFY_OTP') {
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [view]);

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  // Deteksi jika user membuka halaman dari Link Reset Password di Gmail
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken') || params.get('token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setView('RESET_PASSWORD');
    }
  }, []);

  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '841763297039-ol8la463eamcgve42s92libjiag2220o.apps.googleusercontent.com';

  const handleGoogleCallback = async (response: any) => {
    if (!response.credential) return;
    setIsLoading(true);
    try {
      const res = await api.post('/auth/google', { credential: response.credential });
      const { user, token, message } = res.data;
      setAuth(user, token);
      addToast(message || 'Berhasil masuk dengan akun Google!', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Gagal memverifikasi akun Google', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      const g = (window as any).google;
      if (g?.accounts?.id && googleClientId) {
        try {
          g.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCallback,
            auto_select: false,
          });

          const btnContainer = document.getElementById('google-btn-slot');
          if (btnContainer) {
            btnContainer.innerHTML = '';
            g.accounts.id.renderButton(btnContainer, {
              theme: 'outline',
              size: 'large',
              width: 380,
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }
        } catch (e) {
          console.warn('Google GSI init notice:', e);
        }
      }
    };

    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGoogle();
        clearInterval(timer);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [googleClientId, view]);

  // 2. Google Sign-In Fallback Button click
  const handleGoogleSignIn = () => {
    const g = (window as any).google;
    if (g?.accounts?.id) {
      g.accounts.id.prompt();
    } else {
      addToast('Menghubungkan ke layanan Google, mohon tunggu sebentar...', 'info');
    }
  };

  // 3. Submit Pendaftaran atau Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (view === 'REGISTER') {
      if (!checkIsPasswordValid(registerPwdCriteria)) {
        addToast(
          'Kata sandi harus memenuhi semua syarat: minimal 8 karakter, wajib ada huruf kapital (A-Z), huruf kecil (a-z), dan angka (0-9)',
          'error'
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      if (view === 'REGISTER') {
        const response = await api.post('/auth/register', { name, email, password });
        addToast(response.data.message || 'Kode OTP telah dikirim ke Gmail Anda.', 'info');
        setView('VERIFY_OTP');
      } else {
        const response = await api.post('/auth/login', { email, password });
        const { user, token } = response.data;
        setAuth(user, token);
        addToast(`Selamat datang kembali, ${user.name}!`, 'success');
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.requiresOtp) {
        addToast(errorData.error, 'info');
        setView('VERIFY_OTP');
      } else {
        addToast(errorData?.error || 'Terjadi kesalahan pada server', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Verifikasi OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      addToast('Kode OTP harus terdiri dari 6 digit', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      const { user, token, message } = response.data;
      setAuth(user, token);
      addToast(message || 'Verifikasi berhasil!', 'success');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Kode OTP tidak valid atau kedaluwarsa';
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Kirim Ulang OTP
  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      const response = await api.post('/auth/resend-otp', { email });
      addToast(response.data.message || 'Kode OTP baru telah dikirim!', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Gagal mengirim ulang OTP', 'error');
    } finally {
      setIsResending(false);
    }
  };

  // 6. Submit Lupa Password (Minta Link ke Gmail)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      addToast(response.data.message, 'success');
      setView('LOGIN');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Gagal memproses permintaan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Submit Reset Password Baru dari Link Gmail
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('Konfirmasi kata sandi tidak cocok!', 'error');
      return;
    }
    if (!checkIsPasswordValid(resetPwdCriteria)) {
      addToast(
        'Kata sandi baru harus memenuhi semua syarat: minimal 8 karakter, wajib ada huruf kapital (A-Z), huruf kecil (a-z), dan angka (0-9)',
        'error'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      addToast(response.data.message, 'success');
      // Bersihkan query string di URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setView('LOGIN');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Gagal mengatur ulang kata sandi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 text-slate-800">
      {/* Kolom Kiri: Branding & Visual Showcase Linear Style */}
      <div className="relative md:w-5/12 bg-slate-900 text-white flex flex-col justify-between p-8 md:p-12 border-r border-slate-800 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-white">Linear PM</span>
              <span className="ml-2 text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PROD v2.0
              </span>
            </div>
          </div>

          <div className="mt-16 md:mt-24 space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              Manajemen Proyek Berkecepatan Tinggi untuk Tim Modern.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Dilengkapi autentikasi akun Gmail asli, notifikasi otomatis setiap kali ada to-do list baru yang ditugaskan, dan sistem keamanan tingkat enterprise.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-slate-800/80 text-indigo-400 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white block font-medium">Verifikasi Akun Gmail Asli</strong>
                Pendaftaran divalidasi dengan kode OTP langsung ke kotak masuk email Anda.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-slate-800/80 text-indigo-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white block font-medium">Notifikasi Tugas Masuk Otomatis</strong>
                Setiap kali tugas baru di-assign ke Anda, rincian tugas langsung meluncur ke Gmail.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-slate-800/80 text-indigo-400 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white block font-medium">Link Reset Password Sekali Pakai</strong>
                Lupa kata sandi? Reset aman dalam 15 menit melalui tautan khusus di inbox Gmail.
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 text-xs text-slate-500 flex justify-between items-center">
          <span>&copy; {new Date().getFullYear()} Linear PM Workspace</span>
          <span>PostgreSQL &bull; Supabase &bull; Prisma</span>
        </div>
      </div>

      {/* Kolom Kanan: Form Auth Dinamis */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">

          {/* VIEW 1: VERIFIKASI KODE OTP */}
          {view === 'VERIFY_OTP' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 animate-bounce" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Verifikasi Akun Gmail Anda
                </h2>
                <p className="text-sm text-slate-500">
                  Kami telah mengirimkan 6-digit kode OTP ke alamat:
                  <span className="block font-semibold text-slate-800 mt-1">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 text-center mb-2" htmlFor="otp">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  {/* 6 Kotak Kecil OTP PIN Boxes */}
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold font-mono rounded-xl border transition-all duration-150 outline-none ${
                          digit
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs ring-1 ring-indigo-600/30'
                            : 'border-slate-300 bg-white text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                        }`}
                      />
                    ))}
                  </div>
                  {/* Note Petunjuk Cek Spam */}
                  <div className="mt-3.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 leading-relaxed shadow-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold text-amber-900 mb-0.5">
                        Belum menerima kode di kotak masuk utama?
                      </strong>
                      <span className="text-amber-900/80">
                        Mohon periksa folder <strong>Spam</strong> atau tab <strong>Promosi</strong> di akun Gmail Anda. Jangan lupa klik tombol <em>"Bukan Spam"</em> agar pemberitahuan berikutnya langsung masuk ke kotak masuk utama.
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-all duration-150 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verifikasi & Aktifkan Akun</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setView('LOGIN')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ganti Email / Masuk
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  Kirim Ulang Kode
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: LUPA PASSWORD (MINTA LINK RESET KE GMAIL) */}
          {view === 'FORGOT_PASSWORD' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <button
                  type="button"
                  onClick={() => setView('LOGIN')}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke halaman masuk
                </button>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Lupa Kata Sandi?
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Ketik alamat Gmail akun Anda. Kami akan mengirimkan tautan khusus sekali pakai untuk mengatur ulang kata sandi Anda.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="forgot-email">
                    Alamat Email Terdaftar
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Kirim Tautan Reset ke Gmail</span>
                    </>
                  )}
                </button>

                <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-start gap-2 leading-relaxed">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    Jika email belum muncul di kotak masuk utama, mohon periksa folder <strong>Spam</strong> atau tab <strong>Promosi</strong> di Gmail Anda.
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 3: RESET KATA SANDI DARI LINK GMAIL */}
          {view === 'RESET_PASSWORD' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Buat Kata Sandi Baru
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tautan terverifikasi dari inbox Gmail Anda. Silakan masukkan kata sandi baru untuk akun Anda.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="new-password">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 8 karakter (huruf besar, kecil, & angka)"
                      className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordCriteriaBadge criteria={resetPwdCriteria} value={newPassword} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="confirm-password">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <input
                    id="confirm-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Simpan & Masuk dengan Kata Sandi Baru</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* VIEW 4 & 5: LOGIN / REGISTER STANDAR */}
          {(view === 'LOGIN' || view === 'REGISTER') && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {view === 'REGISTER' ? 'Daftar Akun Baru' : 'Masuk ke Ruang Kerja'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {view === 'REGISTER'
                    ? 'Gunakan Gmail aktif Anda untuk menerima notifikasi penugasan to-do list'
                    : 'Pilih opsi cepat atau masukkan kredensial akun Anda'}
                </p>
              </div>

              {/* Slot Resmi Tombol Google GSI */}
              <div id="google-btn-slot" className="w-full flex justify-center min-h-[44px]">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-slate-50 px-3 text-xs uppercase font-medium text-slate-400">
                  atau gunakan email
                </span>
              </div>

              {/* Form Standar */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {view === 'REGISTER' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="name">
                      Nama Lengkap
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Alex Pratama"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="email">
                    Alamat Email (Gmail Aktif)
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-slate-700" htmlFor="password">
                      Kata Sandi
                    </label>
                    {view === 'LOGIN' && (
                      <button
                        type="button"
                        onClick={() => setView('FORGOT_PASSWORD')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
                      >
                        Lupa kata sandi?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        view === 'REGISTER'
                          ? 'Minimal 8 karakter (huruf besar, kecil, angka)'
                          : 'Masukkan kata sandi'
                      }
                      className="w-full pl-3.5 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {view === 'REGISTER' && (
                    <PasswordCriteriaBadge criteria={registerPwdCriteria} value={password} />
                  )}
                </div>

                <button
                  id="submit-auth-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{view === 'REGISTER' ? 'Daftar Akun Baru (Kirim OTP)' : 'Masuk ke Akun'}</span>
                  )}
                </button>
              </form>

              {/* Toggle Register / Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setView(view === 'REGISTER' ? 'LOGIN' : 'REGISTER')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
                >
                  {view === 'REGISTER'
                    ? 'Sudah punya akun? Masuk sekarang'
                    : 'Belum memiliki akun? Daftar dengan Gmail Anda'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
