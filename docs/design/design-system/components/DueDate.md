# DueDate

A finish date that turns `danger` red with a calendar glyph once it has passed and the task isn't Done.

- Props: `children` (the formatted date), `overdue`, `lateBy` (days, adds "· telat 3 hari").
- Date format: "28 Sep", "5 Okt" (Indonesian month abbreviations: Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des); add the year only outside the current one. Ranges: "28 Sep – 2 Okt".
- Overdue = finish date before today and status not Done (Rutin tasks are never overdue).
