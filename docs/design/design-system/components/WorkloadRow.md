# WorkloadRow

One person's active-task count per day as a heatmap strip, aligned to the Gantt columns above it.

- Props: `name` (omit for the personal dashboard row), `counts` (number per day), `weekends` (day indices), `dayWidth`.
- Scale: `heat-0` … `heat-5` for 0 to 5+ active tasks; darker means busier in light mode, brighter in dark. Counts 0–3 are `ink`, 4–5+ are `on-heat`. Empty days show no number.
- The number is always printed, so the heat is never read by colour alone.
- On Timeline Tim, one row per person; 5+ on a weekday is the signal to rebalance.
