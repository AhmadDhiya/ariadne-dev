# Banner

A full-width strip under the top bar that says whose eyes you are looking through.

- Props: `kind` (`guest` shows an eye, `viewing` shows people), `children`, `action` (a text button on the right).
- Two uses only: "Anda melihat sebagai Tamu" on every page a guest sees, and "Melihat dashboard: [nama]" when a supervisor opens someone else's dashboard, with "Kembali ke dashboard saya".
- It uses `sky-soft` with a `sky` icon: calm context, not a warning. Errors and confirmations are not banners.
