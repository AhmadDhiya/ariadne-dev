/**
 * Geometri ikon dari design system (bundle.js): grid 24px, garis 1.75, currentColor.
 * Mengikuti Lucide (lisensi ISC, lihat THIRD_PARTY_NOTICES.md).
 */
type Attrs = Record<string, string | number>
export type Shape = readonly ['path' | 'circle' | 'rect', Attrs]

const circle = (extra: readonly Shape[] = []): readonly Shape[] => [
  ['circle', { cx: 12, cy: 12, r: 9 }],
  ...extra,
]
const path = (d: string): Shape => ['path', { d }]

export const ICONS = {
  'status-not-started': [['circle', { cx: 12, cy: 12, r: 9, strokeDasharray: '3.2 2.9' }]],
  'status-progress': circle([
    ['path', { d: 'M12 3a9 9 0 0 1 0 18z', fill: 'currentColor', stroke: 'none' }],
  ]),
  'status-fixing': [
    path(
      'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z',
    ),
  ],
  'status-blocked': circle([path('M5.6 5.6 18.4 18.4')]),
  'status-hold': circle([path('M10 9v6'), path('M14 9v6')]),
  'status-request': circle([path('M12 7v5l3 2')]),
  'status-done': circle([path('m8 12.5 2.8 2.8L16.5 9')]),
  'status-routine': [
    path('m17 2 4 4-4 4'),
    path('M3 11v-1a4 4 0 0 1 4-4h14'),
    path('m7 22-4-4 4-4'),
    path('M21 13v1a4 4 0 0 1-4 4H3'),
  ],
  'priority-critical': [path('m6 12 6-6 6 6'), path('m6 18 6-6 6 6')],
  'priority-high': [path('m6 15 6-6 6 6')],
  'priority-medium': [path('M6 9h12'), path('M6 15h12')],
  'priority-low': [path('m6 9 6 6 6-6')],
  search: [['circle', { cx: 11, cy: 11, r: 7 }], path('m20 20-4-4')],
  bell: [path('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), path('M10.3 21a1.94 1.94 0 0 0 3.4 0')],
  'chevron-down': [path('m6 9 6 6 6-6')],
  'chevron-right': [path('m9 18 6-6-6-6')],
  plus: [path('M5 12h14'), path('M12 5v14')],
  x: [path('M18 6 6 18'), path('m6 6 12 12')],
  check: [path('M20 6 9 17l-5-5')],
  lock: [['rect', { x: 4, y: 11, width: 16, height: 10, rx: 2 }], path('M8 11V7a4 4 0 0 1 8 0v4')],
  info: circle([path('M12 16v-4'), path('M12 8h.01')]),
  message: [path('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')],
  update: [path('M12 20h9'), path('M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z')],
  at: [['circle', { cx: 12, cy: 12, r: 4 }], path('M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8')],
  move: [path('m16 3 4 4-4 4'), path('M20 7H4'), path('m8 21-4-4 4-4'), path('M4 17h16')],
  calendar: [
    ['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }],
    path('M16 2v4'),
    path('M8 2v4'),
    path('M3 10h18'),
  ],
  eye: [path('M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'), ['circle', { cx: 12, cy: 12, r: 3 }]],
  folder: [
    path(
      'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
    ),
  ],
  dashboard: [
    ['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1 }],
    ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1 }],
    ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1 }],
    ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1 }],
  ],
  timeline: [path('M3 3v18h18'), path('M7 7h7'), path('M10 12h8'), path('M8 17h6')],
  users: [
    path('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'),
    ['circle', { cx: 9, cy: 7, r: 4 }],
    path('M22 21v-2a4 4 0 0 0-3-3.87'),
    path('M16 3.13a4 4 0 0 1 0 7.75'),
  ],
  settings: [
    path('M4 21v-7'),
    path('M4 10V3'),
    path('M12 21v-9'),
    path('M12 8V3'),
    path('M20 21v-5'),
    path('M20 12V3'),
    path('M1 14h6'),
    path('M9 8h6'),
    path('M17 16h6'),
  ],
  more: [
    ['circle', { cx: 5, cy: 12, r: 1 }],
    ['circle', { cx: 12, cy: 12, r: 1 }],
    ['circle', { cx: 19, cy: 12, r: 1 }],
  ],
  milestone: [path('M12 2.5 21.5 12 12 21.5 2.5 12z')],
  mail: [['rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }], path('m22 7-10 6L2 7')],
} as const satisfies Record<string, readonly Shape[]>

export type IconName = keyof typeof ICONS
