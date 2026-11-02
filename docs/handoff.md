# Handoff sesi: Ariadne (per 2 November 2026)

Dokumen ini untuk sesi baru yang melanjutkan pekerjaan. Baca ini, lalu `CLAUDE.md`, `docs/rencana.md` (bagian 5 dan catatan per fase di bagian 7), `docs/domain.md`, dan `docs/pedoman-kode-ai.md`. Catatan detail tiap fase ada di `docs/rencana.md`; dokumen ini hanya ringkasan dan penunjuk.

## 1. Apa proyek ini

**Ariadne, Task Tracker Hub:** aplikasi web internal untuk melacak task dan Gantt lintas banyak proyek, pengganti Google Sheets tim. Dibangun oleh Ahmad (PIC, latar teknis konseptual) bersama Claude Code. Jelaskan keputusan teknis dengan bahasa sederhana (Indonesia) dan minta persetujuan sebelum perubahan besar.

- Backend: ASP.NET Core Web API (.NET 10), EF Core, PostgreSQL, Identity (cookie, satu origin).
- Frontend: React + TypeScript + Vite, React Router, TanStack Query, CSS biasa dengan token design system, komponen atomic (`atoms` → `molecules` → `organisms` → `templates`, lalu `pages`).
- Semua jalan lewat `docker compose up`; konfigurasi lewat environment variable.

## 2. Cara kerja yang sudah disepakati (jangan diubah tanpa izin Ahmad)

1. **Satu fase = satu branch** (`fase-N-nama`), lalu **berhenti dan laporkan** ke Ahmad: apa yang dibuat, cara mencoba, perbedaan dari mockup/rencana, butir checklist pedoman yang belum terpenuhi, dan keputusan yang dibutuhkan. Jangan lanjut ke fase berikutnya atau menggabung ke `main` sebelum Ahmad setuju.
2. Setelah disetujui: gabung dengan `git merge --no-ff` ke `main` (pesan "Gabungkan Fase N: …"), lalu buat branch fase berikutnya. Tindak lanjut kecil boleh jadi branch sendiri.
3. Tiap commit diakhiri `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
4. Sebelum melapor: jalankan `node scripts/check.mjs` (15 langkah: build, format, test backend, paket rentan, typecheck, lint, format, token warna, test unit, build produksi, npm audit, gitleaks x2, test browser katalog, test browser stack penuh di Docker). Semua harus lulus; yang gagal dilaporkan apa adanya.
5. Tiap fitur: test positif dan negatif; tiap endpoint punya baris di matriks izin (`PermissionMatrixTests`, endpoint DELETE dikecualikan dan diuji sendiri); tiap aturan penting dibuktikan dengan **merusaknya sengaja (mutation check)** lalu memastikan test gagal.
6. Setelah halaman dibuat: jalankan aplikasinya, screenshot (Playwright, terang dan gelap), bandingkan dengan `docs/design/screens/*.png`, sebut perbedaan yang tersisa. Komponen baru wajib muncul di `/dev/komponen` (`frontend/src/pages/DevKomponenPage/phaseN.tsx`) dan lolos axe.
7. Paket baru wajib dicek keasliannya di npm/NuGet dan disebut di laporan. Sejauh ini tidak ada paket baru sejak Fase 2.
8. Catatan tiap fase ditambahkan ke `docs/rencana.md` (bagian 7). `docs/design/` dan `docs/domain.md` tidak diubah tanpa izin.

## 3. Status

Semua sudah digabung ke `main` (HEAD: "Gabungkan Fase 6", `277de5e`).

| Fase  | Isi                                                                                                                                                    | Status         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| 0     | Rencana, aturan, dokumen                                                                                                                               | Selesai        |
| 1     | Kerangka repo, Docker, design system, katalog `/dev/komponen`                                                                                          | Selesai        |
| 2     | Login, pengguna, tim, proyek bertingkat, anggota proyek (+ tindak lanjut: mulai dari data kosong, ubah nama dan arsip proyek)                          | Selesai        |
| 3     | Task, nomor otomatis `KODE-n`, tabel proyek, status tertahan wajib beralasan, filter, progres                                                          | Selesai        |
| 4     | Drawer detail task (`?task=SEN-115`), aktivitas (Update/Komentar/Internal/Log), @mention, "Update terakhir" (+ tindak lanjut: ubah dan hapus komentar) | Selesai        |
| 5     | Dashboard pribadi (kartu, Hari Ini, Perlu perhatian, Timeline saya, beban kerja), pencarian global                                                     | Selesai        |
| 6     | Gantt proyek + beban kerja per orang, milestone (tab Milestone, tampil di Gantt dan Timeline saya)                                                     | Selesai        |
| **7** | **Timeline Tim (supervisor)**                                                                                                                          | **Berikutnya** |
| 8     | Undang tamu + tampilan Tamu                                                                                                                            | Belum          |
| 9     | Notifikasi in-app + email, job harian 07.00 WIB                                                                                                        | Belum          |
| 10    | Dashboard mobile (390px) + merapikan tema gelap                                                                                                        | Belum          |

Di luar MVP (jangan dibuat): integrasi Telegram/WhatsApp, Kanban, panah dependensi task, dashboard statistik, laporan PDF, import Excel.

## 4. Keadaan teknis saat ini

**Menjalankan**

- Stack kerja: `docker compose up -d --build` di root repo, buka http://localhost:18080 (API/DB/Mailpit: 18080 web, 54321 Postgres, 18025 Mailpit UI, 10251 SMTP). Docker Desktop harus menyala.
- Login admin awal: `ahmad@perusahaan.co.id`; passwordnya nilai `BOOTSTRAP_ADMIN_PASSWORD` di `.env` (file lokal, tidak di git; **jangan dicetak atau dicatat**). Database kerja berisi **data nyata Ahmad**: proyek "SLMS sentul" (kode `SLMS`, task SLMS-1 s.d. SLMS-7, PIC Ahmad). Jangan `docker compose down -v`.
- Data contoh mockup (Sentul, Migrasi Data Center, 8 anggota, "hari ini" 28 Sep 2026) hanya muncul bila `SEED_PASSWORD` diisi pada database **kosong**; test memakainya.
- `scripts/check.mjs` membuat stack terpisah (`docker compose -p ariadne-e2e`, port 28080/54322/28025/20251, seed aktif, `ASPNETCORE_ENVIRONMENT=Development`, "hari ini" dikunci) lalu membongkarnya. Jangan nyalakan stack lain di port itu saat pemeriksaan jalan. Untuk menjalankan satu berkas test browser stack saja, tiru langkah `runStackE2E` di `scripts/check.mjs` dengan `npx playwright test -c playwright.stack.config.ts <berkas> [--update-snapshots=changed]` di folder `frontend`.
- Backend: `cd backend && dotnet test` (Testcontainers butuh Docker). Frontend: `cd frontend && npm test`, `npm run lint`, `npm run e2e` (katalog).

**Struktur penting**

- `backend/src/Ariadne.Api/`: `Domain/` (entitas dan aturan murni, mis. `TaskRules`, `TimelineRange`), `Features/<Fitur>/` (endpoint minimal API + DTO), `Auth/UserAccess.cs` + `AccessService` (**semua aturan izin di satu tempat**), `Infrastructure/` (data, migrasi, seed, clock, email).
- `backend/tests/Ariadne.Api.Tests/`: `WorldFixture` / `FakeTodayWorldFixture` (dunia contoh dengan satu orang per peran; yang kedua mengunci hari ini ke 28 Sep 2026), `TaskKit.NewSiteAsync` (proyek baru per test), `PermissionMatrixTests`.
- `frontend/src/`: `api/` (hook TanStack Query; hanya `pages/` yang memanggilnya), `lib/` (aturan tampilan murni + test), `components/{atoms,molecules,organisms,templates}`, `pages/`. Aturan import atomic dijaga ESLint. Satu komponen satu folder (`X.tsx`, `X.css`, `X.test.tsx`, `index.ts`).
- `frontend/e2e/` (katalog) dan `frontend/e2e-stack/` (stack penuh; berkas jalan **urut abjad** dan memakai data bersama, jadi test yang menambah data harus membersihkannya; berkas baru diberi nama yang mengurutkannya setelah yang ada).

**Keputusan arsitektur yang perlu diingat**

- Izin: tidak boleh melihat = **404**, boleh melihat tapi tidak boleh mengubah = **403**. Tamu: kontrol edit **disembunyikan** (bukan dinonaktifkan) dan ditegakkan juga di API. Catatan **Internal tidak pernah** dikirim ke Tamu (daftar aktivitas, kolom Update terakhir, perlu perhatian, pencarian).
- Aturan turunan (terlambat, durasi, kelompok Hari Ini, beban kerja, progres, sapaan) dihitung di **server** (`Domain/TaskRules`); frontend hanya menampilkan.
- Task, aktivitas: dihapus = `deleted_at` (disembunyikan lewat query filter global). Milestone: hapus sungguhan. Aktivitas diurutkan dengan nomor urut database (`Seq`), **bukan waktu**; satu `SaveChanges` tidak boleh menyimpan dua entri aktivitas untuk task yang sama (EF mengurutkan sisipan menurut kunci, urutannya acak).
- Zona waktu Asia/Jakarta lewat satu `IClock`; tanggal task disimpan sebagai tanggal saja.
- Nomor task diambil atomik di transaksi (`projects.next_task_number`); edit bersamaan dijaga `xmin`.

**Jebakan yang sudah pernah kena**

- Alat Bash: perintah dengan karakter em dash (—), banyak kutip tunggal, atau heredoc panjang sering gagal diam-diam. Pakai tool Write untuk file/skrip panjang (catatan ada di memori proyek `bash-heredoc-emdash`).
- Setelah `git checkout`/merge di Windows, berkas C# bisa berakhir CRLF dan `dotnet format --verify-no-changes` gagal: jalankan `dotnet format --no-restore` (di folder `backend`).
- Lint React Compiler melarang menetapkan ulang variabel saat render (hitung di fungsi biasa di `lib/`). Nama class CSS harus unik (pernah bentrok `.ar-today`, `.ar-progress`).
- Tombol `ghost` kecil di dalam tabel gagal kontras axe; pakai tombol berbingkai. Nama aksesibel tombol "teks yang bisa diubah" = isi teksnya.
- `npm audit` memunculkan temuan baru seiring waktu; terakhir `minimatch` dipaku lewat `overrides` di `frontend/package.json`.
- Setelah mengubah tampilan, baseline screenshot harus diperbarui (`--update-snapshots`) dan dilihat dulu; jangan menerima perbedaan tanpa melihat.

## 5. Tujuan terdekat: Fase 7, Timeline Tim (supervisor)

Dari `docs/rencana.md` dan mockup `06-timeline-tim.png`, `06a-timeline-tim-pindahkan.png`, `06b-dashboard-dilihat-supervisor.png` (sumber markup di `docs/design/screen-source/`):

1. Halaman Timeline Tim (menu hanya untuk Supervisor; sekarang `TimelineTimPage` masih "segera hadir"): pemilih tim, baris per orang yang bisa dibuka (task-nya), heatmap beban kerja, filter proyek/status/prioritas/hanya terlambat, zoom. **Komponen `GanttChart` (organisme) dan `lib/gantt.ts` sudah dibuat untuk dipakai ulang di sini**; beban kerja di sini lintas proyek per orang (beda dengan Gantt proyek yang hanya satu proyek).
2. Dialog "Pindahkan ke…" (06a): pilih penerima dengan beban calon penerima di rentang task, opsi kabari lewat notifikasi (notifikasi sungguhan baru di Fase 9; sediakan titik sambungnya), dan ubah tanggal langsung dari baris. Menulis log "X memindahkan task dari A ke B" (butuh jenis log baru di `LogKind`/`ActivityData`).
3. Dashboard anggota dilihat supervisor (06b): banner "Melihat dashboard: …", aksi Ubah tanggal / Pindahkan ke…. Dashboard sekarang hanya milik pengguna sendiri (endpoint tanpa parameter pengguna); ini perlu endpoint baru dengan pemeriksaan izin ketat.
4. Izin (domain.md): hanya **supervisor tim itu** yang melihat Timeline Tim dan memindahkan task anggota timnya; Pengelola proyek boleh memindahkan/ubah tanggal task di proyeknya. Test wajib untuk non-supervisor, supervisor tim lain, dan Tamu; tambahkan ke matriks izin.
5. **Selesai jika** (rencana): hanya supervisor tim itu yang bisa membuka dan memindahkan; pemindahan menulis log; screenshot mendekati 06, 06a, 06b.

Tanyakan ke Ahmad bila ada yang tidak jelas di domain.md (mis. apakah memindahkan mengganti semua PIC atau satu PIC).

## 6. Hal terbuka dan utang yang perlu diingat

- **Keputusan Ahmad yang masih menggantung:** (a) bar task tanpa tanggal mulai selebar satu hari: tetap, atau tanggal mulai diisi otomatis saat task dibuat? (b) angka beban kerja di akhir pekan sengaja ditampilkan bila ada task yang melintas ("biarkan dulu").
- **Perlu perhatian di dashboard** dihitung dari data yang ada; Fase 9 menggantinya dengan tabel notifikasi (tanda sudah dibaca, tautan "Lihat semua", lonceng dan badge di topbar).
- Tombol "Undang" di header proyek (mockup 04/03) menunggu Fase 8.
- Teks komentar sebelum diubah tidak disimpan (tidak ada riwayat versi).
- Task yang dibuat sebelum Fase 4/5 tidak punya riwayat aktivitas atau catatan penugasan.
- **Belum pernah dilakukan:** uji beban dengan data seed ×10 (butir E7 pedoman); tampilan layar kecil (Fase 10); pemeriksaan di browser selain Chromium.
- Hosting belum diputuskan; belum ada backup database, konfigurasi produksi (SMTP sungguhan, cookie `Secure`, domain), maupun cara memindahkan data lama dari Google Sheets (import Excel di luar MVP, jadi masih ketik manual atau lewat skrip API sekali jalan).

## 7. Tujuan akhir

Ariadne menggantikan Google Sheets tim: semua proyek dan task di satu tempat dengan tabel, Gantt, beban kerja per orang, dashboard pribadi, Timeline Tim untuk supervisor, tamu klien yang hanya melihat dan berkomentar, dan notifikasi (in-app dan email) untuk mention, penugasan, dan tenggat. Selesai jika kesepuluh fase digabung, `scripts/check.mjs` hijau, semua halaman punya tampilan terang/gelap dan mobile (dashboard), dan Ahmad sudah memutuskan hosting serta cara pakai nyata (pilot satu proyek sambil Google Sheets jalan). Setelah Fase 10: uji beban, backup, konfigurasi produksi, dan rencana migrasi data.

## 8. Prompt pembuka yang disarankan untuk sesi baru

> Lanjutkan Ariadne. Baca `docs/handoff.md`, `CLAUDE.md`, dan catatan Fase 6 di `docs/rencana.md`. `main` sudah berisi Fase 0 sampai 6. Mulai Fase 7 (Timeline Tim) di branch `fase-7-timeline-tim`; periksa dulu bahwa `git status` bersih dan stack kerja menyala, jelaskan rencanamu singkat, lalu kerjakan, jalankan `scripts/check.mjs`, dan berhenti untuk melapor ke saya sebelum menggabung.
