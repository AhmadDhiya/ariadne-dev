# ActivityItem

One entry in a task's activity timeline. Four kinds share one stream, newest first.

- Props: `kind` (`update | comment | log | internal`), `author`, `time`, `guest`, `icon` (log only), `children`. Use `Mention` inside text for @names.
- `update`: a progress report — outlined card with the navy "Update" badge. This is what "Tambah update" creates and what the dashboard counts as the latest update.
- `comment`: plain, no container.
- `log`: automatic, one muted line with a small glyph — "Wiwiet mengubah status On Progress → Blocked", "Syaikhan memindahkan task dari Rama ke Galih".
- `internal`: `internal-surface` with a dashed `internal-line` border and a lock. Never rendered for guests.
- Times: "09.12" today, "Kemarin", then "25 Sep".
