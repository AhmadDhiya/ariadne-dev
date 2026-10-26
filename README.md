# Ariadne — Task Tracker Hub

Aplikasi web internal untuk melacak task dan Gantt lintas proyek, menggantikan Google Sheets tim.

- Rencana dan status tiap fase: [docs/rencana.md](docs/rencana.md)
- Pedoman keamanan dan kualitas kode AI: [docs/pedoman-kode-ai.md](docs/pedoman-kode-ai.md)
- Aturan untuk Claude Code: [CLAUDE.md](CLAUDE.md)
- Desain dan aturan domain: [docs/](docs/)

## Yang perlu dipasang

| Alat | Versi | Untuk |
|---|---|---|
| Docker Desktop | terbaru | database, test backend, pemindai rahasia, menjalankan semuanya |
| .NET SDK | 10.0 (LTS) | backend |
| Node.js | 24 | frontend |

## Pertama kali setelah clone

```bash
cp .env.example .env
```

Buka `.env` lalu isi `POSTGRES_PASSWORD` (huruf dan angka, minimal 16 karakter) dan admin pertama: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (minimal 12 karakter), dan `BOOTSTRAP_ADMIN_NAME`. File ini tidak pernah ikut di-commit.

```bash
git config core.hooksPath .githooks
```

Perintah di atas mengaktifkan pemeriksa rahasia sebelum setiap commit.

```bash
cd frontend && npm ci && npx playwright install chromium
```

## Menjalankan seluruh aplikasi (seperti di server)

```bash
docker compose up --build
```

- Aplikasi: http://localhost:18080
- Kotak surat palsu (email yang dikirim aplikasi): http://localhost:18025

## Masuk ke aplikasi

Database baru kosong. Saat pertama menyala, aplikasi membuat **satu admin** dari `BOOTSTRAP_ADMIN_EMAIL` dan `BOOTSTRAP_ADMIN_PASSWORD` di `.env` (pengaturan ini diabaikan setelah ada pengguna). Buka http://localhost:18080, masuk dengan akun itu, lalu buat tim, pengguna, dan proyek dari menu **Tim** dan **Pengaturan**. Tombol "Lupa password?" mengirim email ke kotak surat palsu di http://localhost:18025.

Untuk mengulang dari awal jalankan `docker compose down -v` (menghapus semua data) lalu `docker compose up --build`.

**Data contoh dari mockup (opsional)**: untuk membandingkan tampilan dengan screenshot, isi `SEED_PASSWORD` di `.env` (minimal 12 karakter) pada database kosong. Aplikasi lalu membuat akun Ahmad (admin), Wiwiet (anggota), Pak Budi (Tamu `budi@klien.example`), dan lainnya (`nama@perusahaan.co.id`), semuanya memakai password itu, beserta tim dan proyek Sentul dan Migrasi Data Center.

Semua port hanya terbuka untuk komputer ini, tidak untuk jaringan. Nomor port sengaja dibuat tidak umum supaya tidak bentrok dengan program lain di komputer Anda:

| Port di komputer | Isi | Port di dalam container |
|---|---|---|
| `18080` | aplikasi (nginx) | 8080 |
| `54321` | PostgreSQL | 5432 |
| `18025` | halaman web Mailpit | 8025 |
| `10251` | SMTP Mailpit | 1025 |

Mengubah port cukup di `docker-compose.yml` (angka sebelum titik dua). Nomor port maksimal 65535.

## Mode pengembangan (lebih cepat, berubah otomatis saat kode disimpan)

1. Nyalakan database dan kotak surat saja:

   ```bash
   docker compose up db mailpit
   ```

2. Simpan connection string untuk backend di *user-secrets* .NET (di luar folder repo, jadi tidak mungkin ter-commit). Ganti `PASSWORD` dengan isi `POSTGRES_PASSWORD` di `.env`:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=54321;Database=ariadne;Username=ariadne;Password=PASSWORD" --project backend/src/Ariadne.Api
   ```

3. Jalankan backend (http://localhost:5077):

   ```bash
   dotnet run --project backend/src/Ariadne.Api
   ```

4. Di terminal lain, jalankan frontend (http://localhost:5173):

   ```bash
   cd frontend && npm run dev
   ```

   Katalog semua komponen (terang dan gelap) ada di http://localhost:5173/dev/komponen. Halaman ini hanya ada di mode pengembangan.

Di mode pengembangan, "hari ini" dikunci ke **Senin, 28 September 2026** supaya tampilan bisa dibandingkan dengan mockup.

## Pemeriksaan sebelum menggabungkan fase

```bash
node scripts/check.mjs
```

Perintah ini menjalankan build, format, lint, test backend dan frontend, pemeriksa token warna, audit paket rentan, pemindai rahasia, dan test browser (katalog komponen, lalu seluruh aplikasi di Docker: login, peran, screenshot, aksesibilitas). Langkah terakhir menyalakan stack Docker **sementara dan terpisah** (nama proyek `ariadne-e2e`, port 28080, database sendiri dengan data contoh, password acak) lalu membongkarnya, jadi data kerja di http://localhost:18080 tidak tersentuh dan tidak butuh `.env`. Tambahkan `--cepat` untuk melewati semua test browser.

## Struktur singkat

```
backend/    ASP.NET Core API (.NET 10) + test xUnit
frontend/   React + TypeScript + Vite; komponen disusun atomic (atoms → molecules → organisms → templates → pages)
docs/       desain, aturan domain, rencana, pedoman
scripts/    pemeriksaan otomatis
```
