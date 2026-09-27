# Avatar

Initials in a circle; `AvatarStack` overlaps several for multi-PIC cells.

- Avatar props: `name`, `size` (24 in tables, 28 in activity, 32 in headers), `guest` (outlined, for client guests).
- AvatarStack props: `names`, `max` (default 3; the rest collapse into "+N"), `size`.
- All members share one `primary-soft` / `primary` treatment — colour never identifies a person; the name tooltip and initials do.
- Guests are always outlined, everywhere they appear, so internal people can tell who can read what.
