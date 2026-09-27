# PriorityIcon

Priority as a bare glyph — never a pill, never a fill — so it can't be mistaken for status.

- Props: `priority` — `critical | high | medium | low`; `showLabel` adds the word; `size` (default 16).
- Glyphs: Critical = double chevron up (`priority-critical`), High = chevron up (`priority-high`), Medium = two bars (`priority-medium`), Low = chevron down (`priority-low`). The shape alone ranks them.
- In tables, show icon + label in the Prioritas column; in the Today list and Gantt labels, the icon alone (it carries a title for screen readers).
- Sort order everywhere: Critical, High, Medium, Low (`PRIORITIES[i].rank`).
