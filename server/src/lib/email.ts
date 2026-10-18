import nodemailer, { Transporter } from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporterInstance: Transporter | null = null;

// Inisialisasi Transporter Nodemailer secara dinamis
const getTransporter = () => {
  if (transporterInstance) return transporterInstance;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

  if (!user || !pass) {
    return null;
  }

  transporterInstance = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return transporterInstance;
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<boolean> => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || `"Linear PM" <${process.env.SMTP_USER || 'noreply@project.app'}>`;

  if (!transporter) {
    console.log('\n==================================================');
    console.log('📧 [SIMULASI PENGIRIMAN EMAIL (SMTP BELUM DISETEL)]');
    console.log(`Kepada  : ${to}`);
    console.log(`Subjek  : ${subject}`);
    console.log(`Pesan   : ${text || 'Lihat konten HTML'}`);
    console.log('Tips: Setel SMTP_USER dan SMTP_PASS di server/.env untuk pengiriman email asli ke inbox.');
    console.log('==================================================\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || '',
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'Auto-Submitted': 'auto-generated',
      },
    });
    console.log(`✅ Email berhasil dikirim ke: ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Gagal mengirim email ke ${to}:`, error);
    return false;
  }
};

/**
 * Template Email 1: Verifikasi Pendaftaran Akun (Kode OTP 6-Digit)
 */
export const sendVerificationOtpEmail = async (to: string, name: string, otp: string) => {
  console.log(`🔐 [KODE OTP TERKIRIM]: ${otp} -> Kepada: ${to}`);
  const subject = `${otp} adalah Kode Verifikasi Pendaftaran Anda`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="margin-bottom: 24px;">
        <span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">Project Management</span>
      </div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">Halo, ${name}! 👋</h2>
      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
        Terima kasih telah mendaftar. Untuk memastikan bahwa akun Gmail ini benar-benar milik Anda, silakan masukkan kode OTP verifikasi berikut ke halaman pendaftaran:
      </p>
      
      <div style="text-align: center; margin: 32px 0; background: #1e293b; padding: 24px; border-radius: 10px; border: 1px solid #334155;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; font-family: monospace;">${otp}</span>
        <div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Berlaku selama 10 menit</div>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        ⚠️ Jangan berikan kode ini kepada siapa pun. Jika Anda tidak merasa mendaftar di layanan ini, silakan abaikan email ini.
      </p>
      <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
      <p style="color: #475569; font-size: 12px; text-align: center; margin: 0;">
        © ${new Date().getFullYear()} Linear & Trello PM App. Semua hak dilindungi.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Kode OTP verifikasi akun Anda adalah: ${otp} (berlaku 10 menit).`,
  });
};

/**
 * Template Email 2: Permintaan Reset Kata Sandi (Link Sekali Pakai)
 */
export const sendResetPasswordEmail = async (to: string, name: string, resetUrl: string) => {
  const subject = 'Permintaan Pengaturan Ulang Kata Sandi (Reset Password)';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="margin-bottom: 24px;">
        <span style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">Keamanan Akun</span>
      </div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">Reset Kata Sandi Anda 🔐</h2>
      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
        Halo <strong>${name}</strong>, kami menerima permintaan untuk mengatur ulang kata sandi akun Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
          Atur Ulang Kata Sandi Saya
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
        Atau salin tautan berikut ke browser Anda jika tombol di atas tidak berfungsi:<br/>
        <a href="${resetUrl}" style="color: #60a5fa; word-break: break-all;">${resetUrl}</a>
      </p>

      <p style="color: #f59e0b; font-size: 13px; background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.2); margin-top: 24px;">
        ⏱️ Link ini hanya berlaku selama <strong>15 menit</strong> dan hanya dapat digunakan 1 kali demi keamanan.
      </p>

      <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
        Jika Anda tidak meminta pengaturan ulang kata sandi, akun Anda tetap aman dan Anda dapat mengabaikan email ini.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Untuk mengatur ulang kata sandi Anda, buka tautan berikut (berlaku 15 menit): ${resetUrl}`,
  });
};

/**
 * Template Email 3: Notifikasi Tugas Masuk (To-Do List Baru Diberikan ke User)
 */
export const sendTaskAssignedEmail = async (
  to: string,
  name: string,
  taskTitle: string,
  boardTitle: string,
  priority: string,
  dueDate: string | null,
  taskUrl: string,
  assignedByName?: string
) => {
  const subject = `📋 Tugas Baru Diberikan: "${taskTitle}"`;
  
  const priorityColor =
    priority === 'URGENT' ? '#ef4444' : priority === 'HIGH' ? '#f97316' : priority === 'MEDIUM' ? '#3b82f6' : '#10b981';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="margin-bottom: 20px;">
        <span style="background: #6366f1; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 13px;">Notifikasi Penugasan</span>
      </div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Halo ${name}, Anda mendapatkan tugas baru! 🚀</h2>
      <p style="color: #94a3b8; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
        ${assignedByName ? `<strong>${assignedByName}</strong> telah menugaskan sebuah kartu kerja kepada Anda:` : 'Sebuah kartu kerja baru telah ditugaskan kepada Anda:'}
      </p>

      <div style="background: #1e293b; padding: 20px; border-radius: 10px; border-left: 4px solid ${priorityColor}; margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 17px;">${taskTitle}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
          <tr>
            <td style="padding: 6px 0; color: #94a3b8; width: 120px;">Papan Kerja:</td>
            <td style="padding: 6px 0; font-weight: 500;">${boardTitle}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #94a3b8;">Prioritas:</td>
            <td style="padding: 6px 0;">
              <span style="background: ${priorityColor}22; color: ${priorityColor}; border: 1px solid ${priorityColor}55; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">
                ${priority}
              </span>
            </td>
          </tr>
          ${
            dueDate
              ? `<tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Tenggat Waktu:</td>
                  <td style="padding: 6px 0; color: #f87171; font-weight: 500;">${new Date(dueDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}</td>
                </tr>`
              : ''
          }
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${taskUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
          Buka Tugas di Papan Kerja →
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
        Email ini dikirim otomatis oleh sistem manajemen proyek Anda.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Halo ${name}, Anda mendapatkan tugas baru: "${taskTitle}" di papan "${boardTitle}". Prioritas: ${priority}. Silakan buka aplikasi untuk mengerjakan.`,
  });
};

/**
 * Template Email 4: Undangan Bergabung ke Ruang Kerja (Workspace Invite)
 */
export const sendWorkspaceInviteEmail = async (
  to: string,
  workspaceName: string,
  inviterName: string,
  inviteLink: string,
  role: string = 'MEMBER'
) => {
  const subject = `Undangan Bergabung ke Workspace "${workspaceName}" dari ${inviterName}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="margin-bottom: 24px;">
        <span style="background: #6366f1; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">Linear PM Workspace</span>
      </div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">Undangan Kolaborasi Tim 🚀</h2>
      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
        <strong style="color: #ffffff;">${inviterName}</strong> telah mengundang Anda untuk bergabung ke ruang kerja tim:
      </p>

      <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #334155;">
        <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">${workspaceName}</div>
        <div style="font-size: 13px; color: #94a3b8;">Peran Akses: <strong style="color: #818cf8;">${role}</strong></div>
      </div>

      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
        Klik tombol di bawah ini untuk langsung menerima undangan dan mulai berkolaborasi:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background: #6366f1; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
          Terima Undangan & Masuk Ruang Kerja →
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
        Tautan undangan ini aman dan berlaku selama 7 hari. Jika tombol di atas tidak berfungsi, salin tautan berikut ke peramban Anda:<br />
        <a href="${inviteLink}" style="color: #818cf8; word-break: break-all;">${inviteLink}</a>
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Halo, ${inviterName} mengundang Anda bergabung ke ruang kerja "${workspaceName}" sebagai ${role}. Buka tautan berikut untuk menerima undangan: ${inviteLink}`,
  });
};

