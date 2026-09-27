# Desain aplikasi: Ariadne — Task Tracker Hub

Tolong buatkan desain UI lengkap (versi MVP) untuk aplikasi web task tracking internal bernama **Ariadne — Task Tracker Hub**. Aplikasi ini menggantikan Google Sheets yang dipakai tim untuk melacak task dan Gantt chart lintas banyak proyek.

## Konteks
- Pengguna: tim internal sekitar 8–20 orang, supervisor/leader, dan tamu dari klien yang hanya melihat progres.
- Bahasa tampilan: **Indonesia**.
- Desktop-first (lebar 1440px), plus satu tampilan mobile untuk dashboard.
- Sediakan **tema terang dan gelap**.
- Tanggal "hari ini" di mockup: **Senin, 28 September 2026**.

## Arah visual
- Profesional, tenang, dan rapi, walaupun datanya padat. Terasa seperti alat kerja serius, bukan aplikasi konsumen yang ramai.
- Motif merek: **benang Ariadne**, yaitu benang yang menuntun keluar dari labirin. Pakai secara halus, misalnya garis tipis yang menghubungkan elemen di logo atau di garis "hari ini" pada Gantt. Jangan berlebihan.
- Status dan prioritas harus bisa dibedakan **tanpa hanya mengandalkan warna** (pakai label teks dan ikon).

**Warna status (8 status):**
- Not Started: abu-abu (outline)
- On Progress: biru
- Fixing: amber
- Blocked: merah
- On Hold: abu-abu gelap
- On Request: ungu
- Done: hijau
- Rutin: teal

**Prioritas (4 level):** Critical, High, Medium, Low. Tampilkan sebagai ikon bendera atau chevron dengan warna berbeda. Harus tetap terlihat berbeda dari pill status.

## Struktur navigasi
- **Sidebar kiri:** logo Ariadne, Dashboard, Timeline Tim (hanya untuk supervisor), pohon Proyek (bisa bertingkat sampai 3 level dan bisa dilipat), Tim, Pengaturan (admin).
- **Topbar:** pencarian global, ikon notifikasi dengan badge jumlah, avatar user.

## Hierarki data
Proyek → Sub-proyek (maksimal 3 level) → Task → Sub-task. Milestone bisa dipasang di level proyek atau sub-proyek.

## Halaman yang perlu didesain

### 1. Login
Email + password, tautan "Lupa password". Sederhana, dengan identitas merek Ariadne.

### 2. Dashboard pribadi (halaman pertama setelah login)
- **4 kartu ringkasan:** Terlambat, Jatuh tempo minggu ini, Sedang dikerjakan, Tertahan.
- **Daftar "Hari Ini":** dikelompokkan jadi Terlambat, Jatuh tempo hari ini, dan Sedang berjalan. Di dalam tiap kelompok, urutkan berdasarkan prioritas (Critical paling atas). Setiap baris menampilkan nama proyek/sub-proyek, dropdown status yang bisa langsung diubah, dan tombol "Tambah update".
- **Timeline pribadi lintas proyek:** Gantt berisi semua task milik user dari semua proyek, dikelompokkan per proyek, dengan milestone berbentuk belah ketupat.
- **Baris beban kerja pribadi:** jumlah task aktif per hari di bawah timeline.
- **Panel "Perlu perhatian":** komentar yang menandai user (@mention), task baru yang ditugaskan, dan task terlambat.

### 3. Halaman proyek — tampilan Tabel
- Breadcrumb (contoh: Sentul / SLMS), nama proyek, persentase progres, avatar anggota.
- Tab: **Tabel | Gantt | Milestone | Anggota**.
- Filter bar: PIC, status, prioritas, label, toggle "Terlambat", "Minggu ini", "Task saya", dan kotak pencarian.
- Tabel dikelompokkan per sub-proyek, dan grupnya bisa dilipat.
- Kolom: ID, Judul, Prioritas, Status, PIC (bisa beberapa avatar), Mulai, Selesai, Durasi (hari), Update terakhir, Label.
- Sub-task tampil menjorok dengan tombol expand.
- Tunjukkan **satu sel yang sedang diedit langsung** (misalnya dropdown status terbuka).
- Tanggal selesai yang sudah lewat tapi belum Done berwarna **merah**.
- Task Blocked/On Hold/On Request menampilkan ikon info. Saat di-hover, muncul tooltip berisi alasan tertahan dan "menunggu siapa".

### 4. Halaman proyek — tampilan Gantt
- Panel kiri berisi daftar task, panel kanan berisi chart.
- Zoom: Hari / Minggu / Bulan.
- Garis vertikal "hari ini", kolom akhir pekan diarsir tipis.
- Bar berwarna sesuai status, dengan ikon prioritas kecil.
- Milestone berbentuk belah ketupat dengan label.
- **Baris beban kerja di bagian bawah:** satu baris per orang, berisi jumlah task aktif per hari dalam bentuk heatmap (makin gelap, makin banyak).

### 5. Detail task (panel samping / drawer)
- Judul, status, prioritas, PIC, tanggal mulai dan selesai, durasi, label, keterangan.
- Jika statusnya tertahan, tampilkan field **Alasan tertahan** (wajib) dan **Menunggu siapa**.
- Daftar sub-task dengan status masing-masing.
- **Timeline aktivitas** yang menggabungkan:
  - Update (badge "Update")
  - Komentar biasa
  - Log otomatis (contoh: "Wiwiet mengubah status On Progress → Blocked", "Syaikhan memindahkan task dari Rama ke Galih")
  - Komentar internal (ikon gembok dan latar berbeda, tidak terlihat oleh tamu)
- Kotak komentar dengan pilihan "Update / Komentar / Internal", dan **popup autocomplete @mention** yang sedang terbuka.

### 6. Timeline Tim (khusus supervisor/leader)
- Pemilih tim. Satu supervisor bisa memegang beberapa tim, dan satu user bisa ada di beberapa tim.
- Satu baris per orang. Barisnya bisa dibuka untuk melihat task-task orang itu dari semua proyek.
- Heatmap beban kerja per hari per orang, supaya langsung terlihat siapa yang kelebihan beban.
- Filter per proyek, status, prioritas, dan "hanya yang terlambat".
- Aksi supervisor: **memindahkan task ke anggota lain** (tunjukkan dialog "Pindahkan ke…") dan **mengubah tanggal task**.
- Klik nama orang untuk membuka dashboard orang itu (tampilkan banner "Melihat dashboard: [nama]").

### 7. Manajemen Tim
Daftar tim, supervisor tiap tim, anggota, dan cara menambah/mengeluarkan anggota.

### 8. Anggota proyek & undang tamu
Daftar anggota dengan peran (Pengelola / Anggota / Tamu), dan dialog undang lewat email dengan pilihan peran.

### 9. Tampilan sebagai Tamu
Halaman proyek seperti biasa, dengan perbedaan:
- Banner "Anda melihat sebagai Tamu".
- Tidak ada tombol edit, dan komentar internal tidak terlihat.
- Tamu tetap bisa berkomentar dan menandai user dengan @.

### 10. Panel notifikasi
Dropdown dari ikon lonceng: di-mention, task baru ditugaskan, task dipindahkan, tenggat besok, dan task terlambat.

### 11. Mobile — Dashboard
Versi HP dari daftar "Hari Ini", dengan aksi cepat ubah status dan tambah update.

## Data dummy (supaya terasa nyata)
- **Anggota:** Syaikhan, Wiwiet, Ahmad, Manto, Rama, Khalil, Bintang, Galih.
- **Proyek "Sentul"**, dengan sub-proyek:
  - Dispatch
  - SLMS, yang berisi sub-proyek "Temuan UAT & API"
  - Smartclassroom
  - FAQ
  - Menagih Pihak Lain
  - Testing Oktober
- **Proyek kedua "Migrasi Data Center"** sebagai contoh lintas proyek.
- **Contoh task:** Pengisian Kebutuhan Server, Integrasi log & metrics, Paket PenTest whitebox, Pipeline GitLab IRS, Perbaikan temuan UAT modul absensi, Penyusunan FAQ, Menunggu akses VPN dari klien (On Request).
- **Contoh milestone:** UAT SLMS (5 Okt), Go-Live Sentul (30 Okt).
- Campurkan semua status dan prioritas. Sertakan beberapa task terlambat dan satu task Blocked dengan alasannya.

## Yang TIDAK termasuk MVP (jangan didesain)
Integrasi Telegram/WhatsApp, Kanban, panah ketergantungan antar-task, dashboard statistik, laporan PDF, dan import Excel.