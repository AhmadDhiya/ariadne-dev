# Prompt untuk Claude Code

Tempel prompt di bawah ini satu per satu. Tunggu setiap fase selesai, cek hasilnya di browser, baru lanjut ke fase berikutnya.

---

## Prompt 1: Fase 0, rencana (pakai Plan Mode)

```
Baca CLAUDE.md, lalu semua file di docs/ (brief-asli.md, domain.md, design-system/BRAND-BOOK.md, design-system/components/*.md) dan lihat semua gambar di docs/design/screens/.

Jangan menulis kode dulu. Buat docs/rencana.md yang berisi:
1. Struktur folder backend/ dan frontend/.
2. Skema database (tabel, kolom, relasi, index) sesuai docs/domain.md.
3. Daftar endpoint API per fitur, lengkap dengan aturan izinnya.
4. Daftar komponen React yang akan di-port dari design system dan daftar halaman.
5. Rencana fase 1–10 (di bawah), masing-masing dengan kriteria "selesai".
6. Pertanyaan atau keputusan yang perlu saya jawab.

Fase yang saya inginkan:
1. Scaffold repo + docker compose + port design system ke frontend/src/ds (termasuk halaman /dev/komponen yang menampilkan semua komponen, terang dan gelap).
2. Login email + password, user, tim, proyek bertingkat (maks 3 level), anggota proyek dan peran.
3. Task: CRUD, sub-task, status (termasuk alasan tertahan), prioritas, PIC, label, dan halaman Proyek — Tabel.
4. Drawer detail task + timeline aktivitas (Update / Komentar / Internal / Log) + @mention.
5. Dashboard pribadi.
6. Proyek — Gantt + baris beban kerja.
7. Timeline Tim (supervisor): pindahkan task, ubah tanggal, lihat dashboard anggota.
8. Undang tamu + tampilan Tamu.
9. Notifikasi in-app + email.
10. Dashboard mobile + rapikan tema gelap.

Tulis penjelasan dalam bahasa Indonesia yang sederhana, karena latar teknis saya konseptual.
```

## Prompt 2: mulai fase berikutnya (ulangi untuk tiap fase)

```
Kerjakan Fase [N] dari docs/rencana.md. Buat branch baru. Selesaikan sampai kriteria "selesai" terpenuhi, termasuk test. Jalankan aplikasinya, ambil screenshot halaman yang berubah, bandingkan dengan docs/design/screens/, lalu perbaiki perbedaannya. Di akhir, ringkas yang sudah jadi, cara mencobanya, dan hal yang perlu saya putuskan.
```

## Prompt saat hasil belum mirip desain

```
Halaman [nama] belum sama dengan docs/design/screens/[file].png. Bandingkan screenshot aplikasi dengan gambar itu bagian demi bagian (jarak, ukuran font, warna token, urutan kolom, teks) dan perbaiki sampai sama. Jangan mengubah token di tokens.css.
```
