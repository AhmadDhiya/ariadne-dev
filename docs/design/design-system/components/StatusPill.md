# StatusPill

The one way to show a task's status: a rounded pill with the status glyph and its name, in that status's soft fill and ink.

- Props: `status` — `not-started | progress | fixing | blocked | hold | request | done | routine`; `select` renders it as a button with a caret (inline edit); `open` shows its pressed state while its Menu is open.
- Labels are fixed and stay in English as the team uses them: Not Started, On Progress, Fixing, Blocked, On Hold, On Request, Done, Rutin.
- Not Started is the only outline pill (dashed `status-not-started`, no fill); On Hold is filled dark grey. Blocked and Done are close in lightness, so the glyph and word are required — never show a coloured dot alone.
- Blocked, On Hold and On Request are "held" statuses (`STATUSES[i].held`): put a HoldTooltip next to them, and require a reason when switching to one.
- Pills are always `radius-full`; nothing else in the product is a round pill except avatars and counts.
