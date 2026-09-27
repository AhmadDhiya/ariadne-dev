# Menu

A floating list: the inline status dropdown, the @mention autocomplete and the "Pindahkan ke…" picker.

- Props: `items` (`{label, status, avatar, icon, meta, selected}`), `activeIndex` (keyboard highlight), `title`, `query` (shows a search row; `""` shows the placeholder), `width`.
- Status dropdown: items with `status` only, the current one `selected`. Changing to a held status opens the reason field before saving.
- @mention: typing "@" opens it under the caret with `query`; items show avatar, name and role (Pengelola / Anggota / Tamu). Guests may mention anyone.
- Pindahkan ke…: `meta` shows each person's active task count so the supervisor can see load while choosing.
- Arrow keys move `activeIndex`, Enter picks, Esc closes.
