# GanttBar

A task bar on the Gantt chart, with its companions `GanttTrack` (day grid), `Milestone` and `TodayMarker`.

- GanttTrack props: `days` (`[{weekend}]`), `dayWidth` (`gantt-day`: 28 Hari, 12 Minggu, 4 Bulan), `height`, `children` (the absolutely placed pieces below). Weekends are hatched with `surface-muted`.
- GanttBar props: `status`, `start` (day index), `span` (days), `label`, `priority`, `overdue`, `top`, `dayWidth`. The bar is the status fill with the status glyph in `on-status`; Not Started is a dashed outline. The label sits to the right with the priority glyph.
- Overdue bars get a `danger` outline ring.
- Milestone props: `day`, `label`, `done`, `top`. A solid `ink` diamond (hollow once done) with a bold label: "UAT SLMS · 5 Okt".
- TodayMarker props: `day`, `label` (default "Hari ini"). The 2px `thread` line with a knot on top — Ariadne's thread through the chart. One per chart, never another colour.
- Rows are `row-height` (36px); bars are `bar-height` (20px).
