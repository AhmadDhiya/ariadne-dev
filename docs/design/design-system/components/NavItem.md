# NavItem

One row of the sidebar: a top-level destination or a node in the project tree.

- Props: `label`, `icon`, `depth` (0–2: project → sub-project → sub-sub-project), `expandable`, `expanded`, `active`, `count` (open tasks).
- Top-level items (Dashboard, Timeline Tim, Tim, Pengaturan) carry an icon; tree children don't. Projects use the `folder` icon.
- The active item gets `primary-soft` and the 2px `thread` marker on its left: the thread shows where you are.
- Hide "Timeline Tim" for non-supervisors and "Pengaturan" for non-admins; don't show them disabled.
- The sidebar is `sidebar-width` (248px) on `canvas`, padding `space-3`.
