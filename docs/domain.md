# Model domain dan aturan bisnis — Ariadne MVP

Dokumen ini melengkapi mockup. Kalau mockup dan dokumen ini bertentangan, tanyakan ke Ahmad.

## Entitas utama

| Entitas | Isi penting |
|---|---|
| **User** | nama, email (login), avatar/inisial, flag Admin aplikasi, preferensi tema |
| **Team** | nama; anggota lewat **TeamMember** (user, peran `Supervisor` atau `Anggota`). Satu user bisa di beberapa tim; satu supervisor bisa memegang beberapa tim. |
| **Project** | nama, kode (mis. `SEN`), `ParentId` untuk sub-proyek. Kedalaman maksimal 3 level (Sentul → SLMS → Temuan UAT & API). Proyek root bisa dikelompokkan di sidebar. |
| **ProjectMember** | user, proyek root, peran `Pengelola` / `Anggota` / `Tamu`. Izin berlaku untuk seluruh sub-proyeknya. |
| **Invitation** | email, proyek, peran, token, kedaluwarsa, status (Menunggu / Diterima / Dibatalkan) |
| **Task** | ID tampilan `KODE-nomor` (nomor berjalan per proyek root), judul, keterangan, proyek/sub-proyek, `ParentTaskId` (sub-task, hanya 1 level), status, prioritas, tanggal mulai, tanggal selesai, PIC (banyak user lewat **TaskAssignee**), label (banyak), `HoldReason`, `WaitingOnUserId` atau `WaitingOnText`, `HeldSince` |
| **Label** | nama, per proyek root |
| **Milestone** | nama, tanggal, proyek atau sub-proyek, flag selesai |
| **Activity** | task, penulis, waktu, jenis: `Update`, `Comment`, `Internal`, `Log`; isi teks; untuk `Log` simpan data terstruktur (mis. status lama → baru, PIC lama → baru, tanggal lama → baru) |
| **Mention** | activity, user yang ditandai |
| **Notification** | penerima, jenis, task, aktor, sudah dibaca, waktu |

## Status

`NotStarted`, `OnProgress`, `Fixing`, `Blocked`, `OnHold`, `OnRequest`, `Done`, `Rutin`.

- **Status tertahan** = Blocked, OnHold, OnRequest. Saat task pindah ke status ini, `HoldReason` **wajib** (tolak di API bila kosong); "Menunggu siapa" opsional. `HeldSince` diisi otomatis. Saat keluar dari status tertahan, kosongkan field-field ini, tetapi riwayatnya tetap tersimpan di log.
- Setiap perubahan status membuat Activity `Log`: "Wiwiet mengubah status On Progress → Blocked".

## Prioritas

`Critical` > `High` > `Medium` > `Low`. Semua daftar yang diurutkan "prioritas" memakai urutan ini, lalu tanggal selesai paling awal.

## Aturan turunan (dihitung, tidak disimpan)

- **Terlambat:** tanggal selesai < hari ini (Asia/Jakarta) **dan** status bukan Done **dan** bukan Rutin. Tampilkan "telat N hari".
- **Durasi:** jumlah hari kerja Senin–Jumat dari mulai sampai selesai, inklusif. (Hari libur nasional: di luar MVP.)
- **Task aktif pada hari D:** mulai ≤ D ≤ selesai dan status bukan Done. Rutin ikut dihitung. Dipakai untuk heatmap beban kerja.
- **Skala heatmap:** 0, 1, 2, 3, 4, 5+ → token `heat-0` … `heat-5`. Angka selalu ditampilkan.
- **Progres proyek:** task Done ÷ semua task (termasuk sub-proyek, tanpa sub-task) × 100%.
- **Dashboard "Hari Ini"** berisi task yang PIC-nya user, dikelompokkan: Terlambat → Jatuh tempo hari ini → Sedang berjalan (mulai ≤ hari ini, belum Done), lalu diurutkan berdasarkan prioritas di tiap kelompok.
- **Kartu ringkasan:** Terlambat; Jatuh tempo minggu ini (selesai antara hari ini dan Jumat pekan ini); Sedang dikerjakan (On Progress + Fixing); Tertahan (Blocked + On Hold + On Request).

## Peran dan izin

| Aksi | Admin | Supervisor tim | Pengelola proyek | Anggota proyek | Tamu proyek |
|---|---|---|---|---|---|
| Pengaturan aplikasi, kelola user | ✓ | | | | |
| Buat tim, atur anggota tim | ✓ | tim sendiri | | | |
| Lihat Timeline Tim, buka dashboard anggota | | tim sendiri | | | |
| Pindahkan task ke anggota lain, ubah tanggal task | | anggota tim sendiri | ✓ | | |
| Kelola proyek, sub-proyek, milestone, anggota, undangan | ✓ | | ✓ | | |
| Buat, ubah, hapus task; ubah status; Tambah update | | | ✓ | ✓ | |
| Komentar biasa dan @mention | | | ✓ | ✓ | ✓ |
| Komentar internal (buat dan lihat) | | | ✓ | ✓ | ✗ tidak pernah dikirim ke Tamu |
| Lihat proyek | | | ✓ | ✓ | hanya proyek yang diundang |

Semua pemeriksaan izin dilakukan di API. Endpoint aktivitas **tidak boleh** mengembalikan Activity `Internal` ke Tamu, termasuk lewat notifikasi, pencarian global, atau jumlah komentar.

## Notifikasi (MVP)

Jenis: di-mention, task baru ditugaskan ke saya, task saya dipindahkan, tenggat besok, task terlambat.

- In-app: ikon lonceng dengan badge jumlah belum dibaca, dan panel dropdown seperti mockup 10.
- Email: segera untuk mention dan penugasan; ringkasan harian pukul 07.00 WIB untuk tenggat besok dan terlambat. Kirim lewat SMTP (konfigurasi di environment).
- Telegram: di luar MVP, tetapi buat pengiriman notifikasi lewat satu interface (`INotificationChannel`) supaya mudah ditambah.

## Log otomatis (Activity `Log`)

Status berubah; PIC berubah atau task dipindahkan ("Syaikhan memindahkan task dari Rama ke Galih"); tanggal berubah; task dibuat; sub-task ditambah.
