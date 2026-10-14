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

Buka `.env` lalu isi `POSTGRES_PASSWORD` (huruf dan angka, minimal 16 karakter). File ini tidak pernah ikut di-commit.

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

- Aplikasi: http://localhost:8080
- Kotak surat palsu (email yang dikirim aplikasi): http://localhost:8025

Semua port hanya terbuka untuk komputer ini, tidak untuk jaringan.

## Mode pengembangan (lebih cepat, berubah otomatis saat kode disimpan)

1. Nyalakan database dan kotak surat saja:

   ```bash
   docker compose up db mailpit
   ```

2. Simpan connection string untuk backend di *user-secrets* .NET (di luar folder repo, jadi tidak mungkin ter-commit). Ganti `PASSWORD` dengan isi `POSTGRES_PASSWORD` di `.env`:

   ```bash
   dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=ariadne;Username=ariadne;Password=PASSWORD" --project backend/src/Ariadne.Api
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

Perintah ini menjalankan build, format, lint, test backend dan frontend, pemeriksa token warna, audit paket rentan, pemindai rahasia, dan test browser (screenshot + aksesibilitas). Tambahkan `--cepat` untuk melewati test browser.

## Struktur singkat

```
backend/    ASP.NET Core API (.NET 10) + test xUnit
frontend/   React + TypeScript + Vite; komponen disusun atomic (atoms → molecules → organisms → templates → pages)
docs/       desain, aturan domain, rencana, pedoman
scripts/    pemeriksaan otomatis
```
