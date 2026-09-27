# Ariadne — Task Tracker Hub

Aplikasi web internal untuk melacak task dan Gantt lintas banyak proyek, menggantikan Google Sheets tim. Dibangun sendirian oleh Ahmad (PIC, latar teknis konseptual) bersama Claude Code. Jelaskan keputusan teknis dengan bahasa sederhana dan minta persetujuan sebelum perubahan besar.

## Stack (sudah diputuskan)

- **Backend:** ASP.NET Core Web API, C#, .NET LTS terbaru yang terpasang (cek `dotnet --version`), EF Core, PostgreSQL, ASP.NET Core Identity dengan login email + password (cookie auth, SPA satu origin).
- **Frontend:** React + TypeScript + Vite, React Router, TanStack Query. Styling memakai CSS biasa dengan CSS variables dari design system (tanpa Tailwind/MUI), supaya token desain terpakai persis.
- **Gantt, heatmap, dan timeline:** dibuat sendiri dari komponen design system (lihat di bawah), bukan library Gantt pihak ketiga.
- **Struktur repo:** `backend/` (solution .NET), `frontend/` (Vite app), `docs/` (desain dan aturan domain, jangan diubah tanpa izin).
- **Hosting:** belum diputuskan. Buat semuanya bisa jalan dengan `docker compose up` (Postgres + API + frontend) dan konfigurasi lewat environment variables.

## Sumber kebenaran desain

- `docs/design/screens/*.png` — mockup final tiap halaman (1440px desktop, 390px mobile). Tiru tata letak, jarak, dan teks sedekat mungkin.
- `docs/design/screen-source/*.dc.html` — markup mockup. Pakai untuk membaca ukuran persis, urutan kolom, dan teks. Tidak bisa dijalankan langsung (butuh runtime editor desain). Jangan salin sintaks `x-import`/`sc-for`-nya; terjemahkan ke komponen React.
- `docs/design/design-system/`:
  - `BRAND-BOOK.md` — aturan warna, tipografi, layout, ikon, bahasa. **Wajib dibaca sebelum membuat UI.**
  - `tokens.json` + `tokens.css` — semua token (tema terang dan gelap). Salin `tokens.css` apa adanya ke frontend.
  - `components/bundle.js` + `bundle.css` + `index.d.ts` — komponen React asli design system (namespace `window.Ariadne`). Port ke komponen TypeScript di `frontend/src/components/` dengan props, class CSS, dan ikon yang sama persis. CSS `bundle.css` dipecah per komponen dengan nama class yang sama.
- **Struktur komponen atomic** (detail dan pembagiannya di `docs/rencana.md` bagian 4): `components/atoms` → `molecules` → `organisms` → `templates`, lalu `pages/`. Import hanya ke tingkat yang lebih rendah. Hanya `pages/` yang memanggil API; komponen lain menerima data lewat props. Satu komponen satu folder (`X.tsx`, `X.css`, `X.test.tsx`, `index.ts`). Buat komponen terpisah bila dipakai di 2 tempat atau lebih, atau bila bagian dari design system.
  - `components/*.md` — panduan pemakaian tiap komponen; `component-previews/*.png` — tampilan yang harus dicapai.
- `docs/domain.md` — model data, peran dan izin, serta aturan bisnis (status tertahan, terlambat, beban kerja, dll.).
- `docs/brief-asli.md` — brief awal dari Ahmad.

## Aturan UI yang sering terlewat

- Bahasa tampilan **Indonesia**. Nama status (Not Started, On Progress, Fixing, Blocked, On Hold, On Request, Done, Rutin) dan prioritas (Critical, High, Medium, Low) tetap dalam bahasa Inggris.
- Status selalu pill = ikon + teks; prioritas selalu ikon chevron tanpa latar. Jangan pernah membedakan hanya dengan warna.
- Warna `thread` (merah logo) hanya untuk: benang di logo, garis "Hari ini" di Gantt, penanda item sidebar aktif, dan badge jumlah notifikasi. Focus ring memakai `sky`.
- Tema terang dan gelap lewat `data-theme="light|dark"` di elemen root; simpan pilihan pengguna.
- Format tanggal: "28 Sep", rentang "28 Sep – 2 Okt", header "Senin, 28 September 2026", jam "09.12". Zona waktu Asia/Jakarta.
- Tamu: sembunyikan (bukan disable) kontrol edit dan komentar internal. **Tegakkan juga di API**; jangan hanya di frontend.

## Cara kerja

- Patuhi `docs/pedoman-kode-ai.md` (kelemahan umum kode buatan AI dan pencegahannya). Tinjau checklist-nya di akhir setiap fase, jalankan `scripts/check`, dan laporkan butir yang belum terpenuhi. Paket baru wajib dicek keasliannya di npm/NuGet dan disebutkan di ringkasan.
- Kerjakan per fase sesuai `docs/rencana.md` (buat di Fase 0). Satu fase = satu branch/PR kecil, lalu berhenti dan ringkas hasilnya untuk Ahmad.
- Setiap endpoint punya test (xUnit + WebApplicationFactory). Setiap aturan izin punya test untuk peran Tamu.
- Buat data seed dari mockup (proyek Sentul dan Migrasi Data Center, anggota Syaikhan, Wiwiet, Ahmad, Manto, Rama, Khalil, Bintang, Galih; "hari ini" dummy 28 Sep 2026) supaya tampilan bisa dibandingkan dengan screenshot.
- Setelah membuat halaman, jalankan aplikasinya, ambil screenshot (Playwright), dan bandingkan dengan PNG di `docs/design/screens/`. Sebutkan perbedaan yang tersisa.
- Di luar MVP (jangan dibuat): integrasi Telegram/WhatsApp, Kanban, panah dependensi antar task, dashboard statistik, laporan PDF, import Excel.
