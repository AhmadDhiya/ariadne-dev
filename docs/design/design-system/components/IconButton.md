# IconButton

A square icon-only button, optionally with a count badge.

- Props: `icon`, `label` (required: becomes the aria-label and tooltip), `badge` (number; 100+ shows "99+"), `size` (`md` 36px, `sm` 24px).
- The notification bell in the top bar is an IconButton with `badge` = unread count; the badge uses `thread`, the red "look here" colour.
- Use `sm` for close buttons in drawers and row-level "more" menus.
