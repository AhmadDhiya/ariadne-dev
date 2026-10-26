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

Buka `.env` lalu isi `POSTGRES_PASSWORD` (huruf dan angka, minimal 16 karakter) dan `SEED_PASSWORD` (password untuk semua akun contoh, minimal 12 karakter). File ini tidak pernah ikut di-commit.

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

Buka http://localhost:18080 lalu masuk dengan salah satu akun contoh. Passwordnya sama untuk semuanya: isi `SEED_PASSWORD` di `.env`.

| Email | Peran |
|---|---|
| `ahmad@perusahaan.co.id` | Admin + Supervisor Tim Sentul dan Tim QA |
| `wiwiet@perusahaan.co.id` | Anggota biasa |
| `budi@klien.example` | Tamu klien (hanya melihat proyek Sentul) |

Akun lain mengikuti pola `nama@perusahaan.co.id` (syaikhan, manto, rama, khalil, galih, bintang). Tombol "Lupa password?" mengirim email ke kotak surat palsu di http://localhost:18025. Data contoh dibuat sekali saat database masih kosong; untuk mengulang dari awal jalankan `docker compose down -v` (menghapus data) lalu `docker compose up --build`.

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

Perintah ini menjalankan build, format, lint, test backend dan frontend, pemeriksa token warna, audit paket rentan, pemindai rahasia, dan test browser (katalog komponen, lalu seluruh aplikasi di Docker: login, peran, screenshot, aksesibilitas). Langkah terakhir menyalakan `docker compose` dan membutuhkan `.env`. Tambahkan `--cepat` untuk melewati semua test browser.

Test browser terhadap aplikasi Docker bisa dijalankan sendiri (aplikasi harus sudah menyala): `cd frontend && npm run e2e:stack`.

## Struktur singkat

```
backend/    ASP.NET Core API (.NET 10) + test xUnit
frontend/   React + TypeScript + Vite; komponen disusun atomic (atoms → molecules → organisms → templates → pages)
docs/       desain, aturan domain, rencana, pedoman
scripts/    pemeriksaan otomatis
```
