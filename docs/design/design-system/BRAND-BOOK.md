Ariadne is an internal task tracker for a team of 8–20 people, their supervisors, and client guests who only follow progress. It replaces a Google Sheets tracker, so it must stay as dense as a spreadsheet while feeling calmer. The brand idea is **Ariadne's thread**: the one line that leads you out of the labyrinth. The palette comes from the company logo's four colours: **navy** (`primary`), **blue** (`status-progress`, `sky`), **red** (`thread`, `status-blocked`) and **green** (`status-done`). In the interface the thread is the logo red, `thread`, and it always means *"you are here"* — never decoration, never a warning.

## Principles

- **Calm density.** Show a lot, quietly. Neutral surfaces, hairline `line` dividers, one logo-navy action colour. Colour is reserved for status, priority and workload.
- **Never colour alone.** Every status is a glyph + word (`StatusPill`), every priority is a shape (`PriorityIcon`), every heat cell prints its number. Blocked red and Done green are close in lightness, so the words carry the meaning.
- **The thread marks position.** `thread` appears only in: the logo's thread, the Gantt today line (`TodayMarker`), the active sidebar marker and the notification count. It is never a focus ring, a banner or an error colour — those are `sky` and `danger`. If you are tempted to use it anywhere else, use `primary` or `ink`.
- **Guests see less, never broken.** For guests, hide edit controls and internal comments entirely; don't show them disabled.

## Content

- Interface language is **Indonesian**. Status and priority names stay in the team's English: Not Started, On Progress, Fixing, Blocked, On Hold, On Request, Done, Rutin; Critical, High, Medium, Low.
- Sentence case everywhere, no trailing full stops on labels, no exclamation marks, no emoji.
- Buttons are verb first: "Tambah task", "Tambah update", "Undang tamu", "Pindahkan ke…", "Simpan".
- Address the user as "Anda" in system copy ("Anda melihat sebagai Tamu"); refer to people by first name ("Wiwiet mengubah status On Progress → Blocked").
- Dates: "Senin, 28 September 2026" in page headers, "28 Sep" in cells, ranges "28 Sep – 2 Okt". Month abbreviations: Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des. Times use a dot: "09.12". Relative: "Kemarin", then the date.
- Durations in working days: "5 hari". Late: "telat 3 hari".
- Task IDs are uppercase project code + number in `id` style: SEN-142.

## Colour

- Page is `canvas`; working areas (tables, Gantt, cards, drawer) are `surface`; header rows, hover and weekend hatches are `surface-muted`; anything floating is `surface-raised` with a shadow.
- Text is `ink`; metadata, column headers and timestamps are `ink-muted`. Both hold 4.5:1 on every surface in both themes.
- `primary` (logo navy in light, periwinkle in dark) is for the single main action, the selected tab and links. Its text partner is `on-primary`. Selected rows and the active nav item use `primary-soft`.
- Control borders (inputs, outline buttons, chips) use `line-strong` (3:1). `line` is only for dividers.
- **Status** — each of the 8 statuses has three tokens: `status-<key>` (Gantt bar fill and lone icons), `status-<key>-soft` (pill fill) and `status-<key>-ink` (pill text, 4.5:1 on its soft). Keys: `not-started` (outline grey), `progress` (logo blue), `fixing` (amber), `blocked` (deep crimson), `hold` (dark grey), `request` (purple), `done` (logo green), `routine` (teal). Blocked is deliberately darker than `thread`, so the red thread and a blocked bar never look alike. Icons inside filled bars use `on-status`.
- **Priority** — `priority-critical`, `-high`, `-medium`, `-low`, used only as glyph colour, never as a fill.
- **Workload** — `heat-0` … `heat-5`, one sequential scale from pale sky to logo navy (0 → 5+ active tasks per day). Numbers on 0–3 are `ink`, on 4–5 `on-heat`.
- **Overdue** — `danger` (an alias of `status-blocked-ink`) for finish dates that have passed on unfinished tasks and for the Terlambat count.
- `sky` (the logo's light blue) is the focus colour and the accent of context banners and @mentions, on `sky-soft`.
- Internal comments sit on `internal-surface` with a dashed `internal-line` border and a lock.
- Themes: Terang (light, first) and Gelap (dark). Build in light, then check dark — every token is set in both.

## Type

- IBM Plex Sans (400/500/600) for everything, IBM Plex Mono for task IDs; both from Google Fonts. Turn on `font-variant-numeric: tabular-nums` for dates, durations and counts.
- `display` 28/36 — login and empty states only. `title` 20/28 — page and drawer titles. `heading` 15/22 — section headings and sub-project group rows. `body` 14/20 — default. `body-strong` 14/20 medium — task titles. `cell` 13/18 — table cells and Gantt labels. `caption` 12/16 medium — column headers, pills, timestamps. `stat` 28/32 — the dashboard numbers. `id` 12/16 mono.

## Layout

- Desktop-first at 1440px: sidebar `sidebar-width` (248px) on `canvas`, top bar `topbar-height` (56px) with global search (360px), bell and avatar. Page gutter `space-6`.
- Rows are `row-height` (36px) in tables, Gantt, the Today list and menus. Controls are `control-height` (32px); in-row controls are `control-height-sm` (24px).
- Tables: sticky header on `surface-muted` in `caption`; sub-project group rows in `heading` with a caret; sub-tasks indent 24px with their own caret. Column order: ID, Judul, Prioritas, Status, PIC, Mulai, Selesai, Durasi, Update terakhir, Label.
- The task drawer is `drawer-width` (520px) from the right with `shadow-lg`; the page behind stays visible.
- Gantt: task list on the left (360px), chart on the right; `gantt-day` is 28px at Hari, 12px at Minggu, 4px at Bulan. The workload rows sit under the chart and share its columns.
- Mobile (390px): the dashboard Today list only, one task per row with its StatusPill as a select and a "Tambah update" button; sidebar becomes a drawer over `overlay`.
- Spacing is a 4px scale (`space-1` … `space-10`). Radii are small: `radius-sm` for controls, bars and cells, `radius-md` for cards and menus, `radius-lg` for dialogs, `radius-full` only for pills, avatars and counts.
- Shadows only for what floats: `shadow-sm` cards, `shadow-md` menus and tooltips, `shadow-lg` dialogs and the drawer.

## Interaction

- Focus is always visible: `focus-ring`, a 2px surface gap then 2px of `sky`, drawn as box-shadow.
- Inline edits (status, PIC, dates) open in place from the cell; a StatusPill `select` opens a `Menu`. Switching to Blocked, On Hold or On Request asks for **Alasan tertahan** (required) and **Menunggu siapa** before saving; those tasks then show a `HoldTooltip`.
- Supervisors can move a task to someone else ("Pindahkan ke…", showing each person's active count) and change its dates; both write a log entry into the activity timeline.
- No motion beyond 120ms fades and the caret rotation.

## Iconography

- Line icons on a 24px grid, 1.75 stroke, round caps, `currentColor`, through `Ariadne.Icon`; 16px in rows, 18px in the top bar, 14px in pills, 12px in bars. Geometry follows Lucide (ISC).
- Status glyphs: dashed circle (Not Started), half-filled circle (On Progress), wrench (Fixing), slashed circle (Blocked), pause (On Hold), clock (On Request), check circle (Done), repeat arrows (Rutin).
- Priority glyphs, 2.5 stroke: double chevron up (Critical), chevron up (High), two bars (Medium), chevron down (Low).
- Milestones are solid `ink` diamonds; the today line is the `thread` with a knot on top.
- `assets/Icons` holds the status and priority glyphs as coloured SVGs for email and documents; `assets/Logos` holds the mark for light and dark grounds.
