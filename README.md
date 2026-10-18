# Manajemen Proyek (Linear PM)

Aplikasi manajemen proyek modern yang terinspirasi oleh Linear dan Trello, dibangun dengan TypeScript, React, Tailwind CSS, Express, Prisma, dan PostgreSQL.

## Fitur Utama

- **Papan Kanban Interaktif**: Drag-and-drop daftar dan kartu tugas secara mulus.
- **Sinkronisasi Real-Time**: Kolaborasi tim instan menggunakan Socket.io.
- **Lampiran & Preview Sampul**: Upload file dan gambar dengan preview sampul otomatis pada kartu papan.
- **Autentikasi Fleksibel**:
  - Login dengan Password
  - OTP & Magic Link via Email (SMTP Gmail)
  - Login via Google OAuth
- **Manajemen Workspace & Kolaborasi**: Kode undangan workspace dengan hak akses bertingkat (Admin, Member, Viewer).
- **Pencarian Cepat (Command Palette)**: Akses cepat dengan shortcut `Ctrl + K`.
- **Mode Gelap & Terang**: Tampilan dinamis Dark/Light mode yang nyaman di mata.
- **Riwayat Aktivitas**: Audit trail dan log perubahan aktivitas untuk setiap tugas.
- **Tampilan Kalender**: Melihat jadwal deadline kartu tugas dalam format kalender bulanan.

## Tech Stack

### Frontend (Client)
- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS, Lucide React Icons
- **State Management**: Zustand
- **Networking**: Axios, Socket.io-client
- **Date Handling**: date-fns

### Backend (Server)
- **Runtime**: Node.js + Express + TypeScript
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Realtime**: Socket.io
- **Security**: JWT, Bcrypt, Helmet, CORS, Rate Limiting
- **Email**: Nodemailer (Gmail SMTP)
- **Upload**: Multer

---

## Panduan Instalasi & Menjalankan

### 1. Clone Repository
```bash
git clone https://github.com/Yudhaaa-code/Manajemen-Proyek.git
cd Manajemen-Proyek
```

### 2. Konfigurasi Environment Variable

Salin template konfigurasi `.env.example` ke `.env`:

**Server:**
```bash
cp server/.env.example server/.env
```
Isi konfigurasi database PostgreSQL, JWT secret, dan kredensial SMTP Gmail pada file `server/.env`.

**Client:**
```bash
cp client/.env.example client/.env
```
Sesuaikan URL API dan Client ID Google OAuth jika diperlukan.

### 3. Install Dependensi
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 4. Setup Database (Prisma)
Di dalam direktori `server`:
```bash
npx prisma db push
# atau jika ingin menjalankan seed data awal:
npm run seed
```

### 5. Menjalankan Aplikasi
Dari root direktori:
```bash
npm run dev
```
Atau jalankan masing-masing:
- **Server**: `cd server && npm run dev` (berjalan di `http://localhost:5000`)
- **Client**: `cd client && npm run dev` (berjalan di `http://localhost:5173`)

---

## Lisensi
Distributed under the MIT License.
