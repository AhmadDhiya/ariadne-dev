# Logo

The Ariadne mark and wordmark: three labyrinth walls in `ink` with one `thread` line that runs from the centre out through every gap and ends in a knot.

- Props: `size` (px of the mark, default 28), `subtitle` (string, default "Task Tracker Hub"; `false` hides it), `markOnly`.
- Use the full lockup at the top of the sidebar (size 28) and on the login card (size 40). Use `markOnly` for the collapsed sidebar, favicons and the mobile header.
- The mark redraws from tokens, so it follows the theme. Outside React use `assets/Logos/ariadne-mark.svg` (light grounds) or `ariadne-mark-dark.svg` (dark grounds).
- Don't recolour the walls, add a container shape, or animate the thread. The thread is the only place the mark uses `thread`.
