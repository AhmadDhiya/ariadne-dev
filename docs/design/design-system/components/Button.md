# Button

Actions, in three weights: `primary` (navy fill), `secondary` (outlined, default) and `ghost`.

- Props: `variant`, `size` (`md` 32px, `sm` 24px for actions inside rows), `icon`, `iconEnd`, `children`, plus any button attribute.
- One `primary` per view, for the thing the page is for: "Simpan", "Undang", "Pindahkan". Everything else is secondary or ghost.
- Labels are Indonesian, verb first, sentence case, no trailing punctuation: "Tambah update", "Undang tamu", "Lupa password?" is a link, not a button.
- Hidden (not disabled) for guests: guests never see edit actions.
