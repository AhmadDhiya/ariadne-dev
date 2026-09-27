# FilterChip

A compact filter control for the project filter bar and Timeline Tim: either a dropdown chip or an on/off toggle.

- Props: `label`, `value` (shown as "PIC: Ahmad" once chosen), `count` (number of selected values), `toggle` (on/off chip, no caret), `active`.
- Order in the bar: PIC, Status, Prioritas, Label, then the toggles Terlambat, Minggu ini, Task saya, then the search field on the right.
- Active chips switch to `primary-soft` with a `primary` border and a check — never colour alone.
