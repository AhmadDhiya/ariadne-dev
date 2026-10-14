# Rencana pembangunan Ariadne

Dokumen ini adalah peta kerja dari Fase 1 sampai Fase 10. Belum ada kode yang ditulis. Di akhir dokumen ada **daftar keputusan** yang perlu Anda jawab; setiap pertanyaan sudah saya beri rekomendasi, jadi Anda cukup menulis "setuju" atau memilih yang lain.

Istilah yang sering muncul:

- **API / backend**: program di server yang menyimpan data dan memeriksa izin. Dibuat dengan ASP.NET Core (C#).
- **Frontend**: tampilan yang dibuka di browser. Dibuat dengan React.
- **Endpoint**: satu "pintu" di API, misalnya `GET /api/tasks/123` untuk mengambil satu task.
- **Migrasi**: file yang membuat/mengubah tabel database secara otomatis dan tercatat, jadi database di laptop dan di server selalu sama.
- **Seed**: data contoh (Sentul, Migrasi Data Center, Syaikhan, Wiwiet, dan lainnya) yang dimasukkan otomatis supaya tampilan bisa dibandingkan dengan mockup.

## Kondisi mesin saat ini

| Alat | Status |
|---|---|
| Node.js | v24.16 terpasang |
| Docker | 29.5 terpasang |
| .NET SDK | 10.0.401 (LTS) terpasang lewat winget |
| Git | repo sudah dibuat (`git init`), belum ada commit dan belum ada remote |

---

## 1. Struktur folder

Prinsipnya: sesedikit mungkin proyek dan lapisan, supaya mudah diikuti. Backend cukup **satu proyek API** yang dibagi per fitur, ditambah **satu proyek test**.

```
ariadne/
├─ CLAUDE.md, README.md
├─ docker-compose.yml          ← menyalakan db + api + web + mailpit sekaligus
├─ .env.example                ← contoh pengaturan (password db, SMTP, dll.)
├─ docs/                       ← desain & aturan (tidak diubah tanpa izin)
├─ backend/
│  ├─ Ariadne.sln
│  ├─ Dockerfile
│  ├─ src/Ariadne.Api/
│  │  ├─ Program.cs            ← titik awal: auth cookie, database, routing
│  │  ├─ Domain/               ← entitas (Task, Project, …), enum status/prioritas,
│  │  │                           aturan turunan (Terlambat, Durasi, Beban kerja)
│  │  ├─ Features/             ← satu folder per fitur, isinya endpoint + logika:
│  │  │  ├─ Auth/  Users/  Teams/  Projects/  Members/  Invitations/
│  │  │  ├─ Tasks/  Activities/  Dashboard/  Gantt/  TeamTimeline/
│  │  │  └─ Notifications/  Search/
│  │  ├─ Infrastructure/
│  │  │  ├─ Data/              ← AppDbContext, Migrations/, Seed/
│  │  │  ├─ Email/             ← pengirim SMTP + template email
│  │  │  ├─ Notifications/     ← INotificationChannel (InApp, Email; Telegram nanti)
│  │  │  ├─ Jobs/              ← tugas terjadwal (ringkasan 07.00 WIB)
│  │  │  └─ Clock/             ← "hari ini" (bisa dikunci ke 28 Sep 2026 untuk demo)
│  │  └─ Auth/                 ← aturan izin (Admin, Supervisor, Pengelola, Anggota, Tamu)
│  └─ tests/Ariadne.Api.Tests/ ← xUnit + WebApplicationFactory + Postgres di Docker
└─ frontend/
   ├─ Dockerfile, nginx.conf   ← nginx menyajikan frontend dan meneruskan /api ke backend
   ├─ package.json, vite.config.ts, playwright.config.ts
   ├─ src/
   │  ├─ main.tsx, App.tsx, routes.tsx
   │  ├─ styles/               ← tokens.css (salinan apa adanya), font, reset dasar
   │  ├─ components/           ← SEMUA komponen, disusun atomic (lihat bagian 4)
   │  │  ├─ atoms/             ← bagian terkecil: Icon, Button, Avatar, StatusPill, …
   │  │  ├─ molecules/         ← gabungan beberapa atom: SearchField, FilterChip, NavItem, …
   │  │  ├─ organisms/         ← satu bagian utuh halaman: Sidebar, TaskTable, GanttChart, …
   │  │  └─ templates/         ← kerangka tata letak: AppShell, AuthLayout, ProjectLayout, …
   │  ├─ pages/                ← halaman: mengambil data lalu mengisi template & organism
   │  ├─ api/                  ← pemanggil API + hook TanStack Query + tipe data
   │  ├─ hooks/                ← hook umum (tema, shortcut keyboard, klik di luar)
   │  └─ lib/                  ← format tanggal Indonesia, STATUSES/PRIORITIES, utilitas kecil
   └─ e2e/                     ← test Playwright + screenshot pembanding mockup
```

**Kenapa satu origin?** Frontend dan API dibuka dari alamat yang sama (`/` untuk halaman, `/api` untuk data). Dengan begitu login cukup memakai cookie biasa, lebih aman dan lebih sederhana daripada token. Saat pengembangan, Vite meneruskan `/api` ke backend; di Docker, nginx yang melakukannya.

**Isi `docker compose up`:**

| Layanan | Isi |
|---|---|
| `db` | PostgreSQL 17, data disimpan di volume |
| `api` | backend .NET; saat start menjalankan migrasi dan (di mode dev) seed |
| `web` | nginx berisi hasil build frontend, port 8080 |
| `mailpit` | "kotak surat palsu" untuk melihat email yang dikirim aplikasi saat pengembangan (http://localhost:8025) |

---

## 2. Skema database

Semua ID memakai UUID. Status, prioritas, dan peran disimpan sebagai teks (`'OnProgress'`, `'Critical'`, `'Tamu'`) supaya mudah dibaca langsung di database. Waktu disimpan dalam UTC dan ditampilkan dalam Asia/Jakarta; tanggal mulai/selesai task disimpan sebagai tanggal saja (tanpa jam).

### Pengguna dan tim

**users** (tabel pengguna dari ASP.NET Core Identity, ditambah kolom kita)
| Kolom | Keterangan |
|---|---|
| id, email, password_hash, … | kolom standar Identity |
| display_name | "Wiwiet" |
| is_admin | admin aplikasi |
| theme | `light` / `dark` / kosong (ikuti sistem) |
| is_active | nonaktifkan tanpa menghapus |
| created_at | |

**teams**: id, name, created_at

**team_members**: team_id → teams, user_id → users, role (`Supervisor` / `Anggota`)
- kunci utama (team_id, user_id); index user_id (untuk "tim saya")

### Proyek

**projects**
| Kolom | Keterangan |
|---|---|
| id | |
| parent_id → projects | kosong untuk proyek root |
| root_id → projects | proyek root-nya (untuk dirinya sendiri = id sendiri). Mempercepat cek izin karena izin berlaku per proyek root |
| depth | 0, 1, atau 2 (maksimal 3 level; dicek di API dan di database) |
| name | "SLMS" |
| code | hanya untuk root, unik: `SEN`, `MDC` |
| next_task_number | hanya untuk root: nomor berikutnya untuk `SEN-146` |
| sort_order | urutan di sidebar |
| archived_at | arsip, bukan hapus |
- index parent_id, root_id

**project_members**: project_id (root) → projects, user_id → users, role (`Pengelola` / `Anggota` / `Tamu`), added_at
- kunci utama (project_id, user_id); index user_id

**invitations**
| Kolom | Keterangan |
|---|---|
| id, project_id (root), email, role | |
| token_hash | token di tautan email; yang disimpan hanya hash-nya |
| message | pesan opsional |
| invited_by → users, created_at, expires_at | kedaluwarsa (usul: 14 hari) |
| status | `Menunggu` / `Diterima` / `Dibatalkan` |
| accepted_user_id → users | |
- index unik token_hash; index (project_id, status)

### Task

**tasks**
| Kolom | Keterangan |
|---|---|
| id | |
| project_id → projects | sub-proyek tempat task berada |
| root_project_id → projects | untuk izin dan nomor |
| number | 115 → ditampilkan `SEN-115`; unik per (root_project_id, number) |
| parent_task_id → tasks | sub-task, hanya 1 level (sub-task tidak boleh punya sub-task) |
| title, description | |
| status | 8 status |
| priority | `Critical` / `High` / `Medium` / `Low` |
| start_date, due_date | tanggal |
| hold_reason | wajib jika status tertahan |
| waiting_on_user_id → users / waiting_on_text | "Manto" atau "Klien, tim IT" |
| held_since | diisi otomatis saat masuk status tertahan |
| sort_order | urutan di tabel |
| created_by, created_at, updated_at | |
| deleted_at | hapus = disembunyikan (lihat Keputusan 10) |
- index (project_id), (root_project_id, number) unik, (parent_task_id), (due_date), (status)

**task_assignees** (PIC): task_id, user_id; kunci utama keduanya; index user_id

**labels**: id, root_project_id, name; unik (root_project_id, nama huruf kecil)

**task_labels**: task_id, label_id

**milestones**: id, project_id (proyek atau sub-proyek), name, date, is_done; index (project_id, date)

### Aktivitas dan notifikasi

**activities**
| Kolom | Keterangan |
|---|---|
| id, task_id, author_id (kosong untuk log sistem), created_at | |
| kind | `Update` / `Comment` / `Internal` / `Log` |
| body | teks komentar/update |
| log_type | untuk `Log`: `Created`, `SubtaskAdded`, `StatusChanged`, `AssigneesChanged`, `Moved`, `DatesChanged` |
| data (jsonb) | data terstruktur log, mis. `{"from":"OnProgress","to":"Blocked","holdReason":"…"}` |
- index (task_id, created_at), (task_id, kind, created_at) untuk "Update terakhir"

**mentions**: activity_id, user_id; kunci utama keduanya; index user_id

**notifications**
| Kolom | Keterangan |
|---|---|
| id, recipient_id, kind, task_id, actor_id, activity_id | kind: `Mention`, `Assigned`, `Moved`, `DueTomorrow`, `Overdue` |
| created_at, read_at, emailed_at | |
| dedupe_key | mencegah notifikasi "tenggat besok"/"terlambat" dobel di hari yang sama |
- index (recipient_id, read_at, created_at), unik (recipient_id, dedupe_key)

Tambahan teknis kecil: tabel `data_protection_keys` supaya login tidak ter-logout setiap container di-restart.

### Aturan yang dihitung (tidak disimpan)

Terlambat, telat N hari, durasi hari kerja, task aktif per hari (heatmap), progres proyek, isi "Hari Ini", dan kartu ringkasan dihitung di backend dalam satu tempat (`Domain/Rules`) dan diuji dengan test unit. "Hari ini" diambil dari `Clock`, yang di mode demo dikunci ke **Senin, 28 September 2026** lewat environment variable `Ariadne__FakeToday`.

---

## 3. Endpoint API

Keterangan izin: **Adm** = Admin aplikasi, **Sup** = supervisor tim (hanya untuk tim/anggota timnya), **Pgl** = Pengelola proyek, **Ang** = Anggota proyek, **Tmu** = Tamu proyek, **Masuk** = siapa pun yang sudah login. Kalau tidak diizinkan, API menjawab 403; kalau proyek/task tidak boleh dilihat sama sekali, API menjawab 404 (supaya tamu tidak bisa menebak isi proyek lain).

**Aturan tetap untuk Tamu di semua endpoint:** Activity `Internal` tidak pernah dikirim, termasuk lewat daftar aktivitas, notifikasi, pencarian, jumlah komentar, dan "Update terakhir". Email anggota lain juga tidak ditampilkan ke Tamu.

### Auth dan akun
| Endpoint | Guna | Izin |
|---|---|---|
| `POST /api/auth/login` | email + password + "Ingat saya" | publik |
| `POST /api/auth/logout` | keluar | Masuk |
| `GET /api/auth/me` | data diri, admin?, tim yang dipegang, tema | Masuk |
| `POST /api/auth/forgot-password` | kirim email reset | publik |
| `POST /api/auth/reset-password` | simpan password baru dari tautan | publik (token) |
| `PATCH /api/me` | ubah nama, tema, password | Masuk |

### Pengguna (Pengaturan)
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/users` | daftar semua pengguna | Adm |
| `POST /api/users` | tambah pengguna internal (email berisi tautan buat password) | Adm |
| `PATCH /api/users/{id}` | ubah nama, admin, nonaktifkan | Adm |
| `GET /api/users/lookup?q=` | cari orang internal untuk kolom pilih (tambah anggota, dll.) | Adm, Sup, Pgl |

### Tim
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/teams` | daftar tim (Admin: semua; lainnya: tim tempat ia berada) | Masuk (non-Tamu) |
| `GET /api/teams/{id}` | detail tim + anggota + task aktif per orang | Adm, anggota tim |
| `POST /api/teams` | buat tim | Adm |
| `PATCH /api/teams/{id}` | ubah nama | Adm, Sup |
| `POST /api/teams/{id}/members` | tambah anggota (peran Supervisor/Anggota) | Adm, Sup |
| `PATCH /api/teams/{id}/members/{userId}` | ubah peran | Adm, Sup |
| `DELETE /api/teams/{id}/members/{userId}` | keluarkan | Adm, Sup |

### Proyek
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/projects/tree` | pohon sidebar + jumlah task terbuka | Masuk (hanya proyek yang boleh dilihat) |
| `GET /api/projects/{id}` | header: breadcrumb, nama, progres, avatar anggota | Pgl, Ang, Tmu |
| `POST /api/projects` | buat proyek root (+ kode) | Adm |
| `POST /api/projects/{id}/children` | buat sub-proyek (tolak jika > 3 level) | Adm, Pgl |
| `PATCH /api/projects/{id}` | ubah nama/urutan/pindah induk | Adm, Pgl |
| `POST /api/projects/{id}/archive` | arsipkan | Adm, Pgl |

### Anggota proyek dan undangan
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/projects/{id}/members` | daftar anggota + peran (email disembunyikan untuk Tamu) | Pgl, Ang, Tmu |
| `POST /api/projects/{id}/members` | tambah pengguna internal langsung | Adm, Pgl |
| `PATCH /api/projects/{id}/members/{userId}` | ubah peran | Adm, Pgl |
| `DELETE /api/projects/{id}/members/{userId}` | keluarkan | Adm, Pgl |
| `GET /api/projects/{id}/invitations` | undangan yang masih menunggu | Adm, Pgl |
| `POST /api/projects/{id}/invitations` | undang beberapa email + peran + pesan | Adm, Pgl |
| `DELETE /api/invitations/{id}` | batalkan | Adm, Pgl |
| `GET /api/invitations/{token}` | info undangan (nama proyek, pengundang) | publik (token) |
| `POST /api/invitations/{token}/accept` | terima: buat akun (nama + password) atau gabungkan ke akun yang ada | publik (token) |

### Task
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/projects/{id}/tasks` | isi tabel, dikelompokkan per sub-proyek; filter `pic, status, priority, label, overdue, thisWeek, mine, q` | Pgl, Ang, Tmu |
| `POST /api/projects/{id}/tasks` | buat task | Pgl, Ang |
| `GET /api/tasks/{key}` | detail untuk drawer (`key` = id atau `SEN-115`) | Pgl, Ang, Tmu |
| `PATCH /api/tasks/{id}` | ubah judul, keterangan, prioritas, label, sub-proyek | Pgl, Ang |
| `PUT /api/tasks/{id}/status` | ubah status; **tolak 400 jika status tertahan tanpa alasan** | Pgl, Ang |
| `PUT /api/tasks/{id}/dates` | ubah tanggal mulai/selesai | Pgl, Ang, Sup (jika PIC anggota timnya) |
| `PUT /api/tasks/{id}/assignees` | ubah PIC | Pgl, Ang |
| `POST /api/tasks/{id}/move` | "Pindahkan ke…" dari satu PIC ke orang lain, opsi kabari lewat notifikasi | Pgl, Sup (jika PIC lama anggota timnya) |
| `POST /api/tasks/{id}/subtasks` | tambah sub-task | Pgl, Ang |
| `DELETE /api/tasks/{id}` | hapus | Pgl, Ang |
| `GET /api/projects/{id}/labels`, `POST …/labels` | daftar & tambah label | lihat: Pgl, Ang, Tmu; tambah: Pgl, Ang |

Setiap perubahan status, PIC, tanggal, pembuatan task, dan penambahan sub-task otomatis menulis Activity `Log`.

### Aktivitas
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/tasks/{id}/activities` | timeline, terbaru di atas; tanpa `Internal` untuk Tamu | Pgl, Ang, Tmu |
| `POST /api/tasks/{id}/activities` | kirim `Update` / `Comment` / `Internal` + daftar mention | Update & Internal: Pgl, Ang; Comment: Pgl, Ang, Tmu |
| `GET /api/tasks/{id}/mentionable?q=` | daftar orang untuk popup @ | Pgl, Ang, Tmu |

Catatan: komentar `Internal` yang me-mention seorang Tamu tidak membuat notifikasi untuk Tamu itu.

### Dashboard
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/dashboard?userId=` | 4 kartu, daftar Hari Ini, panel Perlu perhatian | diri sendiri; Sup untuk anggota timnya |
| `GET /api/dashboard/timeline?userId=&from=&to=` | Timeline saya (per proyek) + milestone + beban kerja pribadi | sama |

Saat supervisor melihat dashboard orang lain, hanya task dari proyek yang **boleh dilihat supervisor** yang tampil (lihat Keputusan 8).

### Gantt dan milestone
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/projects/{id}/gantt?from=&to=` | baris task, milestone, beban kerja per orang | Pgl, Ang, Tmu |
| `GET /api/projects/{id}/milestones` | daftar milestone (tab Milestone) | Pgl, Ang, Tmu |
| `POST /api/projects/{id}/milestones` | tambah | Adm, Pgl |
| `PATCH /api/milestones/{id}`, `DELETE /api/milestones/{id}` | ubah, tandai selesai, hapus | Adm, Pgl |

### Timeline Tim
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/team-timeline?teamId=&from=&to=&project=&status=&priority=&overdueOnly=` | satu baris per orang + heatmap + task per orang | Sup (tim sendiri) |
| `GET /api/tasks/{id}/move-candidates` | calon penerima + beban hari per hari di rentang task | Sup, Pgl |

Pindahkan dan ubah tanggal memakai `POST /api/tasks/{id}/move` dan `PUT /api/tasks/{id}/dates` di atas.

### Notifikasi dan pencarian
| Endpoint | Guna | Izin |
|---|---|---|
| `GET /api/notifications?filter=all\|unread\|mentions` | isi panel & halaman "Lihat semua" | Masuk (hanya miliknya) |
| `GET /api/notifications/unread-count` | angka di lonceng | Masuk |
| `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` | tandai dibaca | Masuk |
| `GET /api/search?q=` | pencarian global: task, proyek, orang | Masuk (hanya yang boleh dilihat) |

### Lain-lain
| Endpoint | Guna |
|---|---|
| `GET /api/health` | cek API hidup (dipakai Docker) |

**Test:** setiap endpoint punya test xUnit + WebApplicationFactory yang berjalan pada PostgreSQL sungguhan di Docker (Testcontainers). Setiap aturan izin punya test "Tamu ditolak / Tamu tidak melihat Internal".

---

## 4. Komponen dan halaman

### 4a. Struktur komponen atomic

Komponen dipecah dari bagian terkecil ke terbesar, seperti menyusun bangunan dari bata. Analoginya:

- **Atom** = bata. Satu elemen dasar, contohnya tombol, ikon, avatar, atau pill status. Tidak bisa dipecah lagi tanpa kehilangan makna.
- **Molekul** = dinding. Beberapa atom yang bekerja bersama untuk satu tugas kecil. Contoh: kotak pencarian = ikon kaca pembesar + input + petunjuk `/`.
- **Organisme** = ruangan. Satu bagian utuh halaman. Contoh: Sidebar, tabel task, Gantt chart.
- **Template** = denah rumah. Kerangka tata letak tanpa data. Contoh: sidebar kiri + topbar + area konten.
- **Page** = rumah yang sudah dihuni. Template yang diisi data sungguhan dari API.

**Aturan main (dicek otomatis oleh ESLint):**

1. **Import hanya boleh ke bawah.** Atom tidak boleh memakai molekul; molekul tidak boleh memakai organisme; dan seterusnya. Pengecualian: semua tingkat boleh memakai atom `Icon`.
2. **Atom, molekul, organisme, dan template tidak memanggil API.** Semua datanya lewat props. Hanya `pages/` yang mengambil data (TanStack Query). Karena itu setiap komponen bisa ditampilkan di `/dev/komponen` dengan data contoh dan dites sendiri-sendiri.
3. **Satu komponen, satu folder:** `Button/Button.tsx`, `Button.css`, `Button.test.tsx`, `index.ts`. CSS dari `bundle.css` dipecah ke file tiap komponen dengan **nama class yang sama persis**.
4. **Props, nama class, dan ikon sama persis** dengan `index.d.ts` design system, supaya hasilnya identik dengan `component-previews/`.
5. **Kapan membuat komponen baru:** jika dipakai di dua tempat atau lebih, atau jika bagian dari design system. Potongan yang hanya dipakai sekali di satu halaman tetap di dalam organismenya. Tujuannya supaya tidak ada ratusan file kecil yang sulit dicari.
6. **Tidak ada warna/ukuran yang ditulis langsung.** Semuanya dari variabel `tokens.css`.

### 4b. Pembagian komponen

Tanda ★ = komponen asli design system (di-port dari `bundle.js`). Tanpa tanda = komponen tambahan yang dipakai mockup tetapi belum ada di design system; dibuat dengan token yang sama.

**Atom** (`components/atoms/`)

| Komponen | Dipakai untuk |
|---|---|
| ★ `Icon` | semua ikon line + 8 ikon status + 4 ikon prioritas |
| ★ `Mark` | logo tanpa tulisan (header mobile, favicon) |
| ★ `Button` | primary / secondary / ghost, ukuran md & sm |
| ★ `IconButton` | tombol ikon, termasuk lonceng dengan badge |
| ★ `Avatar` | inisial; versi bergaris untuk Tamu |
| ★ `Label` | label abu-abu (Infra, UAT) |
| ★ `StatusPill` | pill status, termasuk mode `select` |
| ★ `PriorityIcon` | chevron prioritas |
| ★ `DueDate` | tanggal selesai, merah bila terlambat |
| ★ `Mention` | @nama di dalam komentar |
| `TextInput`, `TextArea`, `Checkbox`, `Radio`, `Select` | elemen form dasar |
| `ProgressBar` | progres proyek (58%) |
| `HeatCell` | satu kotak angka di heatmap |
| `Kbd` | petunjuk tombol keyboard (`/`) |
| `VisuallyHidden` | teks khusus pembaca layar |

**Molekul** (`components/molecules/`)

| Komponen | Isi |
|---|---|
| ★ `Logo` | Mark + nama "Ariadne" + subjudul |
| ★ `AvatarStack` | beberapa Avatar bertumpuk + "+N" |
| ★ `SearchField` | ikon + input + Kbd |
| ★ `FilterChip` | chip filter dropdown / toggle |
| ★ `Tabs` | Tabel / Gantt / Milestone / Anggota |
| ★ `NavItem` | satu baris sidebar / pohon proyek |
| ★ `HoldTooltip` | tombol info + kartu alasan tertahan |
| ★ `SummaryCard` | satu kartu angka dashboard |
| ★ `Banner` | "Anda melihat sebagai Tamu" / "Melihat dashboard: …" |
| ★ `ActivityItem` | satu entri timeline aktivitas (4 jenis) |
| ★ `GanttTrack`, `GanttBar`, `Milestone`, `TodayMarker` | potongan Gantt |
| ★ `WorkloadRow` | satu baris heatmap (kumpulan HeatCell) |
| `MenuItem` | satu baris di Menu (status / orang / ikon + meta) |
| `FormField` | label + input + pesan error |
| `RadioCard` | pilihan peran di dialog undang |
| `EmailChipsInput` | input banyak email |
| `DateRangeField` | tanggal mulai – selesai |
| `SegmentedControl` | Hari / Minggu / Bulan |
| `Breadcrumb` | Proyek / Sentul |
| `Popover` | wadah melayang untuk Menu dan dropdown |
| `Toast`, `EmptyState` | pesan berhasil/gagal, tampilan kosong |
| `TaskRow`, `GroupRow` | satu baris task / baris grup sub-proyek (dipakai tabel, Hari Ini, Timeline Tim). **Dibuat di Fase 3** bersama tabelnya |

**Organisme** (`components/organisms/`)

| Komponen | Dipakai di |
|---|---|
| ★ `Menu` + variannya `StatusMenu`, `MentionMenu`, `MemberPicker` | dropdown status, popup @, "Pindahkan ke…" |
| `Dialog`, `Drawer` | wadah dialog dan panel samping |
| `Sidebar`, `Topbar`, `NotificationPanel` | semua halaman |
| `LoginForm` | Login |
| `SummaryCards`, `TodayList`, `AttentionPanel` | Dashboard |
| `ProjectHeader`, `FilterBar`, `TaskTable` | Proyek, Tabel |
| `GanttChart`, `WorkloadGrid` | Proyek, Gantt; Timeline saya; Timeline Tim |
| `TaskDetail` (+ `HoldReasonPanel`, `SubtaskList`, `ActivityTimeline`, `CommentComposer`) | Drawer detail task |
| `TeamTimelineGrid`, `MoveTaskDialog` | Timeline Tim |
| `TeamList`, `TeamMemberTable` | Tim |
| `MemberTable`, `InviteDialog` | Anggota proyek |
| `MilestoneList`, `UserTable` | Milestone, Pengaturan |

**Template** (`components/templates/`)

| Template | Isi |
|---|---|
| `AppShell` | Sidebar + Topbar + (Banner opsional) + konten |
| `AuthLayout` | panel labirin kiri + form kanan (Login, lupa password, undangan) |
| `ProjectLayout` | ProjectHeader + Tabs + isi tab |
| `MobileShell` | header mobile + sidebar sebagai drawer |

`/dev/komponen` menampilkan semua komponen dikelompokkan per tingkat (Atom → Molekul → Organisme → Template), masing-masing dalam tema terang dan gelap.

### 4c. Halaman

| Rute | Halaman | Mockup | Fase |
|---|---|---|---|
| `/dev/komponen` | semua komponen, terang & gelap (hanya mode dev) | `component-previews/` | 1 |
| `/masuk` | Login | 01 | 2 |
| `/lupa-password`, `/reset-password` | lupa & atur ulang password | (tanpa mockup; gaya login) | 2 |
| `/undangan/:token` | terima undangan, buat password | (tanpa mockup; gaya login) | 8 |
| `/pengaturan` | kelola pengguna (Admin) | (tanpa mockup) | 2 |
| `/tim` | Manajemen Tim | 07 | 2 |
| `/proyek/:id/anggota` | Anggota proyek | 08 | 2 (+ undang di 8) |
| `/proyek/:id/tabel` | Proyek, Tabel | 03, 03-gelap | 3 |
| `…?task=SEN-115` | Drawer detail task (di atas halaman mana pun) | 05 | 4 |
| `/` | Dashboard pribadi | 02, 02-gelap, 10 | 5 |
| `/proyek/:id/gantt` | Proyek, Gantt | 04 | 6 |
| `/proyek/:id/milestone` | daftar milestone | (tanpa mockup) | 6 |
| `/timeline-tim` | Timeline Tim | 06, 06a | 7 |
| `/dashboard/:userId` | Dashboard anggota dilihat supervisor | 06b | 7 |
| (mode Tamu pada halaman proyek) | Tampilan Tamu | 09 | 8 |
| panel lonceng + `/notifikasi` | Notifikasi | 10 | 9 |
| `/` di layar < 768px | Dashboard mobile | 11 | 10 |

Bagian bersama: `AppShell` = `Sidebar` (248px) + `Topbar` (56px, pencarian global, lonceng, avatar + menu: tema, keluar).

---

## 5. Rencana fase

Setiap fase: satu branch (`fase-N-nama`), test hijau, aplikasi dijalankan, screenshot dibandingkan dengan mockup, lalu saya berhenti dan meringkas untuk Anda.

**Syarat umum "selesai" untuk setiap fase** (di luar kriteria khusus tiap fase):
- `scripts/check` hijau: test backend, test frontend, lint (termasuk aturan import atomic), pemeriksa token warna, gitleaks, dan audit dependensi. Hasilnya ditempel di ringkasan.
- Checklist [pedoman-kode-ai.md](pedoman-kode-ai.md) ditinjau untuk fitur fase itu. Butir yang belum terpenuhi disebut terang-terangan.
- Paket baru (npm/NuGet) disebutkan beserta alasannya.
- Komponen baru ditempatkan di tingkat atomic yang benar dan muncul di `/dev/komponen`.

### Fase 1: Kerangka repo + Docker + design system

**Status: selesai, menunggu tinjauan Ahmad** (branch `fase-1-kerangka`). Catatan hasil ada di bagian 7.

- Solution .NET (API + test), aplikasi Vite, `docker-compose.yml`, `.env.example`, `.gitignore`, README cara menjalankan.
- API: `/api/health`, koneksi Postgres, migrasi kosong pertama, Clock dengan "hari ini" bisa dikunci, header keamanan, error tanpa detail teknis di produksi.
- Frontend: token + font IBM Plex, semua komponen atom dan molekul dari bagian 4b, ditambah organisme dasar (`Menu`, `Dialog`, `Drawer`) dan halaman `/dev/komponen` dengan tombol ganti tema.
- Pengaman otomatis dari [pedoman-kode-ai.md](pedoman-kode-ai.md): gitleaks sebelum commit, ESLint + Prettier + `dotnet format`, aturan arah import atomic, pemeriksa warna hex, audit dependensi, dan `scripts/check` untuk menjalankan semuanya.
- Playwright + axe terpasang; test screenshot pertama untuk `/dev/komponen`.

**Selesai jika:** `docker compose up` menyalakan semua layanan tanpa error; `/api/health` menjawab OK; `/dev/komponen` tampil per tingkat atomic dan setiap komponen mirip `component-previews/*.png` dalam tema terang, lalu terbaca baik di tema gelap; `scripts/check` hijau; commit berisi rahasia palsu ditolak gitleaks; atom yang mencoba meng-import molekul ditolak lint.

### Fase 2: Login, pengguna, tim, proyek bertingkat, anggota proyek
- Identity + cookie login, "Ingat saya", lupa/reset password (email terlihat di Mailpit).
- Tabel users, teams, team_members, projects, project_members + seed dari mockup.
- Halaman: Login (01), Pengaturan (kelola pengguna), Tim (07), Anggota proyek (08, tanpa undangan dulu), sidebar dengan pohon proyek yang bisa dilipat, topbar.
- Aturan izin dasar dan menu tersembunyi (Timeline Tim hanya Sup, Pengaturan hanya Adm).

**Selesai jika:** bisa login sebagai Ahmad (seed) dan melihat sidebar seperti mockup; proyek level ke-4 ditolak API; supervisor bisa menambah/mengeluarkan anggota timnya sendiri tetapi tidak tim lain; semua endpoint fase ini punya test termasuk penolakan untuk Tamu; screenshot Login, Tim, Anggota mendekati 01, 07, 08.

### Fase 3: Task + halaman Proyek, Tabel
- Tabel tasks, task_assignees, labels, task_labels; nomor `SEN-xxx` otomatis per proyek root.
- CRUD task, sub-task, ubah status inline (Menu), wajib alasan saat tertahan, PIC banyak orang, label.
- Halaman Proyek, Tabel (03): header + progres, tab, filter bar lengkap, grup sub-proyek yang bisa dilipat, sub-task menjorok, tanggal merah bila terlambat, HoldTooltip, pencarian di proyek.
- Aturan turunan: Terlambat, telat N hari, Durasi hari kerja, Progres.
- Seed task Sentul & Migrasi Data Center sesuai mockup (termasuk task Done tambahan supaya angka "41 dari 71" cocok).

**Selesai jika:** status ke Blocked tanpa alasan ditolak API (ada test); ubah status langsung tersimpan tanpa reload; semua filter bekerja; Tamu tidak bisa membuat/mengubah task (test); screenshot tabel terang dan gelap mendekati 03 dan 03-gelap.

### Fase 4: Drawer detail task + aktivitas + @mention
- Tabel activities dan mentions; log otomatis untuk status, PIC, tanggal, task dibuat, sub-task ditambah.
- Drawer 520px (05): semua field bisa diedit di tempat, blok Alasan tertahan / Menunggu siapa, daftar sub-task, timeline aktivitas 4 jenis, kotak komentar Update / Komentar / Internal, popup @mention dengan keyboard.
- Kolom "Update terakhir" di tabel diisi dari Update terbaru.

**Selesai jika:** mengubah status menghasilkan baris log "Ahmad mengubah status …"; Tamu tidak menerima Internal dari endpoint mana pun (test); @mention tersimpan; drawer bisa dibuka lewat URL `?task=SEN-115`; screenshot mendekati 05.

### Fase 5: Dashboard pribadi
- 4 kartu ringkasan (bisa diklik sebagai filter), daftar Hari Ini per kelompok dan urut prioritas, ubah status & "Tambah update" langsung dari baris, panel Perlu perhatian, Timeline saya (Gantt pribadi lintas proyek) + beban kerja pribadi, tombol "Tambah task" (pilih proyek dulu).
- Pencarian global di topbar (task, proyek, orang; tombol `/`).
- Tema terang/gelap tersimpan di akun.

**Selesai jika:** dengan "hari ini" 28 Sep 2026 dan data seed, angka dan urutan sama dengan 02; aturan pengelompokan punya test unit; pencarian tidak pernah menampilkan proyek yang tidak boleh dilihat (test); screenshot 02 dan 02-gelap mendekati mockup.

### Fase 6: Proyek, Gantt + beban kerja + milestone
- Gantt (04): daftar task kiri 360px, chart kanan, zoom Hari/Minggu/Bulan, tombol "Hari ini", garis hari ini, akhir pekan diarsir, bar sesuai status, milestone belah ketupat, baris beban kerja per orang di bawah.
- CRUD milestone + tab Milestone (daftar sederhana, tanpa mockup).

**Selesai jika:** posisi bar dan angka heatmap cocok dengan 04 untuk data seed; perhitungan beban kerja punya test unit; bisa digulir horizontal tanpa patah di ketiga zoom; screenshot mendekati 04.

### Fase 7: Timeline Tim (supervisor)
- Pemilih tim, baris per orang yang bisa dibuka, heatmap, filter proyek/status/prioritas/hanya terlambat, zoom.
- Dialog "Pindahkan ke…" (06a) dengan beban calon penerima di rentang task dan opsi kabari lewat notifikasi; ubah tanggal langsung dari baris.
- Dashboard anggota dilihat supervisor (06b) dengan banner "Melihat dashboard: …" dan aksi Ubah tanggal / Pindahkan ke….

**Selesai jika:** hanya supervisor tim itu yang bisa membuka Timeline Tim dan memindahkan task anggotanya (test untuk non-supervisor dan Tamu); pemindahan menulis log "Syaikhan memindahkan task dari Rama ke Galih"; screenshot mendekati 06, 06a, 06b.

### Fase 8: Undang tamu + tampilan Tamu
- Dialog Undang (08), email undangan, halaman terima undangan dan buat password, daftar undangan menunggu + Batalkan.
- Tampilan Tamu (09): banner, kontrol edit **disembunyikan**, tab kotak komentar hanya "Komentar", sidebar hanya proyek yang diundang, avatar tamu bergaris.
- Audit izin menyeluruh: satu set test yang menjalankan semua endpoint sebagai Tamu.

**Selesai jika:** alur undang → email di Mailpit → terima → login sebagai tamu berjalan; tamu tidak melihat Internal, tombol edit, Timeline Tim, atau proyek lain; semua test izin Tamu hijau; screenshot mendekati 09.

### Fase 9: Notifikasi in-app + email
- Tabel notifications; pembuatan notifikasi untuk mention, penugasan, dipindahkan; job harian pukul 07.00 WIB untuk tenggat besok dan terlambat.
- Panel lonceng (10) dengan tab Semua / Belum dibaca / Di-mention, badge jumlah, "Tandai semua dibaca", halaman "Lihat semua".
- Pengiriman lewat `INotificationChannel` (InApp + Email via SMTP); email segera untuk mention dan penugasan, ringkasan harian untuk sisanya.

**Selesai jika:** setiap jenis notifikasi punya test; notifikasi harian tidak dobel bila job jalan dua kali; email terlihat di Mailpit dengan ikon status dari `assets/Icons`; screenshot panel mendekati 10.

### Fase 10: Dashboard mobile + merapikan tema gelap
- Tampilan < 768px (11): header dengan menu, kartu ringkasan ringkas, daftar Hari Ini berbentuk kartu, status bisa diubah, "Tambah update", sidebar jadi drawer.
- Pemeriksaan semua halaman di tema gelap; perbaikan kontras dan detail.

**Selesai jika:** screenshot 390px mendekati 11; semua halaman punya screenshot tema gelap tanpa teks yang tidak terbaca; seluruh test backend dan Playwright hijau.

---

## 6. Keputusan

**Status: semua keputusan disetujui Ahmad pada 27 September 2026** (1 sudah dikerjakan; 2–13 "setuju semua" sesuai rekomendasi). Rekomendasi di bawah ini sekarang berlaku sebagai keputusan.

**1. Versi .NET.** ✓ Sudah diputuskan: .NET 10 SDK (LTS) sudah terpasang di laptop.

**2. Cara Tamu masuk.** Halaman login menulis "Tamu dari klien masuk lewat tautan undangan di email". Rekomendasi: tautan undangan membuka halaman untuk **membuat nama + password sekali**, lalu setelahnya tamu login seperti biasa di halaman yang sama. Alternatif: tamu selalu masuk lewat tautan email (tanpa password), lebih mudah untuk tamu tetapi lebih rumit dibuat.

**3. Siapa yang membuat akun pegawai?** Rekomendasi: tidak ada pendaftaran bebas. **Admin menambah pengguna** di Pengaturan; orang itu menerima email untuk membuat password.

**4. "cuti 30 Sep" di dialog Pindahkan ke… (06a).** Data cuti tidak ada di `domain.md`. Rekomendasi: **tidak dibuat di MVP**; kolom itu hanya menampilkan "paling longgar" / "padat". Alternatif: tambah fitur cuti sederhana (tanggal cuti per orang), sekitar setengah fase tambahan.

**5. Beban kerja di akhir pekan.** `domain.md` bilang task aktif dihitung setiap hari dari mulai sampai selesai, tetapi di mockup Gantt dan Timeline Tim, hari Sabtu/Minggu kosong kecuali untuk task **Rutin** (Galih). Rekomendasi: **ikuti mockup**, task biasa dihitung hanya Senin–Jumat, task Rutin dihitung setiap hari.

**6. Halaman tanpa mockup.** Tab **Milestone**, **Pengaturan**, **Lupa password**, **Terima undangan**, dan halaman **Semua notifikasi** tidak punya gambar. Rekomendasi: saya buat sederhana memakai komponen yang sama (tabel/daftar dan kartu seperti Login), lalu Anda tinjau di akhir fasenya.

**7. Hubungan tim dan proyek.** Halaman Tim menulis "Proyek: Sentul, Migrasi Data Center", tetapi di `domain.md` tim dan proyek tidak terhubung. Rekomendasi: **dihitung otomatis**, yaitu proyek tempat anggota tim itu bekerja. Tidak perlu diatur manual.

**8. Supervisor dan proyek yang bukan miliknya.** Rekomendasi: di Timeline Tim dan dashboard anggota, supervisor **melihat dan boleh memindahkan/mengubah tanggal** semua task anggota timnya, termasuk dari proyek yang supervisor itu tidak ikuti. Tetapi supervisor **tidak bisa membuka halaman proyek** itu kecuali ia anggotanya. Calon penerima "Pindahkan ke…" = anggota tim yang juga anggota (bukan Tamu) proyek task itu.

**9. Siapa yang membuat proyek root (mis. "Sentul")?** Rekomendasi: **Admin** membuat proyek root dan kodenya (SEN), lalu menunjuk Pengelola. Pengelola membuat sub-proyek, milestone, dan mengelola anggota.

**10. Hapus task.** Rekomendasi: task yang dihapus **disembunyikan** (bisa dipulihkan lewat database), bukan hilang permanen. Sub-task ikut tersembunyi.

**11. Pencarian global** tidak masuk daftar fase Anda, tetapi ada di topbar setiap mockup. Rekomendasi: saya masukkan ke **Fase 5**.

**12. Branch dan PR.** Belum ada remote GitHub. Rekomendasi: saya buat branch per fase dan menggabungkannya ke `main` secara lokal setelah Anda cek. Kalau Anda punya repo GitHub, beri tahu alamatnya, maka setiap fase jadi PR.

**13. Email saat pengembangan.** Rekomendasi: semua email masuk ke **Mailpit** (kotak surat palsu di laptop) sampai hosting dan SMTP asli diputuskan, jadi tidak ada email yang terkirim ke orang sungguhan.

---

## 7. Catatan hasil per fase

### Fase 1 (27 September 2026)

**Perbedaan dari rencana**
- `Spinner` tidak dibuat: brand book melarang animasi selain fade 120ms dan putaran caret. Keadaan memuat memakai teks ("Memeriksa sambungan…").
- `Tooltip` tidak dibuat: nama avatar dan tombol ikon sudah memakai atribut `title` seperti design system; komponen tambahan belum dibutuhkan (pedoman G5).
- `TaskRow` dan `GroupRow` dipindah ke Fase 3, karena bentuknya bergantung pada kolom tabel yang baru dibuat di fase itu.
- Test ditaruh per komponen (`X.test.tsx`) hanya untuk komponen yang punya perilaku; komponen tampilan murni (Label, Kbd, Mark) dicek lewat screenshot di Playwright.

**Perbedaan dari design system (sengaja, demi aksesibilitas)**
- **Label prioritas** ("High", "Medium") sempat memakai warna `ink` demi kontras, tetapi **Ahmad memutuskan (14 Oktober 2026) kembali ke warna prioritas seperti mockup**. Konsekuensinya diterima: di tema terang kata "High" (4,06:1) dan "Medium" (3,85:1) di bawah syarat WCAG 4,5:1 untuk teks kecil. Maknanya tetap tidak bergantung pada warna (ikon + kata selalu tampil). Pemeriksaan axe mengecualikan hanya elemen ini (`ACCEPTED_LOW_CONTRAST` di `frontend/e2e/helpers.ts`); jangan diperluas ke elemen lain. Bila kelak ada keluhan keterbacaan, perbaikannya cukup menggelapkan token `priority-high`/`priority-medium` di design system.
- **NavItem** dibangun dari tautan + tombol buka/tutup (bukan `div role="treeitem"`), supaya sidebar bisa dipakai dengan keyboard. Tampilannya sama.
- **HoldTooltip** kartunya melayang di kanan tombol info (seperti mockup 03), dan terbuka saat hover atau fokus keyboard.
- **SummaryCard** bisa menjadi tombol (brand book: "Each card is a link that filters the Today list").

**Temuan tentang design system**
- `tokens.css` mendefinisikan alias `--danger`, `--link`, `--focus` hanya di blok `:root`. Untuk tema satu halaman penuh ini benar; hanya bermasalah bila tema dipasang bersarang (seperti katalog komponen, yang sudah ditangani di CSS katalog).
- `component-previews/*.png` dirender tanpa huruf IBM Plex; aplikasi memakai IBM Plex sesuai brand book, jadi bentuk huruf terlihat sedikit berbeda.

### Pemeliharaan 14 Oktober 2026 (sebelum merge Fase 1)

`scripts/check.mjs` menemukan dua kerentanan baru yang muncul setelah 27 September, tanpa ada perubahan kode:

- **NuGet:** `System.Security.Cryptography.Xml` dan `.Pkcs` 10.0.12 (5 advisori denial-of-service, 4 tingkat High), dibawa oleh `Microsoft.AspNetCore.DataProtection.EntityFrameworkCore` yang dipakai untuk kunci cookie login. Diperbaiki dengan menaikkan semua paket Microsoft, `dotnet-ef`, dan image runtime Docker ke **10.0.13**.
- **npm:** `source-map-js` 1.2.1 (High, denial-of-service), hanya alat build/test, tidak ikut ke browser. Diperbaiki ke 1.2.2 lewat `npm audit fix`; hanya 3 baris `package-lock.json` yang berubah.

Pelajaran untuk fase berikutnya: audit paket harus dijalankan ulang di awal setiap fase, bukan hanya di akhir. Kerentanan baru bisa muncul kapan saja pada kode yang tidak kita ubah.
