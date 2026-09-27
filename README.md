# Paket serah-terima desain Ariadne untuk Claude Code

Isi paket:

- `CLAUDE.md` — dibaca otomatis oleh Claude Code setiap sesi: stack, sumber desain, aturan UI, cara kerja.
- `PROMPT-AWAL.md` — prompt yang tinggal ditempel, per fase.
- `docs/brief-asli.md` — brief awal.
- `docs/domain.md` — model data, peran dan izin, aturan bisnis.
- `docs/design/screens/` — 13 mockup halaman (PNG), ditambah 2 contoh tema gelap.
- `docs/design/screen-source/` — markup mockup (`.dc.html`) sebagai referensi ukuran dan teks.
- `docs/design/design-system/` — brand book, token (`tokens.json`, `tokens.css`), komponen React asli (`components/bundle.js`, `bundle.css`, `index.d.ts`), panduan tiap komponen, preview komponen, logo, dan ikon.

Cara pakai singkat:

1. Buat folder proyek, misalnya `ariadne`, lalu salin **isi** paket ini ke dalamnya, sehingga `CLAUDE.md` ada di root folder.
2. Jalankan `git init` di folder itu.
3. Buka terminal di folder itu, jalankan `claude`, lalu tempel Prompt 1 dari `PROMPT-AWAL.md`.
