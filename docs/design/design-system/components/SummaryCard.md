# SummaryCard

One count on the personal dashboard, with its label and a short hint.

- Props: `label`, `value`, `icon`, `tone` (`danger` for Terlambat, `held` for Tertahan, none otherwise), `hint`.
- The dashboard shows exactly four, in this order: Terlambat, Jatuh tempo minggu ini, Sedang dikerjakan, Tertahan. Each card is a link that filters the Today list.
- The number uses the `stat` style with tabular figures. Only Terlambat is red, and only when its value is above 0.
