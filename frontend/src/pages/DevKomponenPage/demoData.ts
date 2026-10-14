import type { MenuItemData } from '@/components/molecules/MenuItem'
import { STATUSES } from '@/lib/status'

/** Data contoh untuk katalog komponen, diambil dari mockup. */

export const MEMBERS = [
  { name: 'Ahmad', role: 'Pengelola' },
  { name: 'Syaikhan', role: 'Pengelola' },
  { name: 'Wiwiet', role: 'Anggota' },
  { name: 'Manto', role: 'Anggota' },
  { name: 'Rama', role: 'Anggota' },
  { name: 'Khalil', role: 'Anggota' },
  { name: 'Galih', role: 'Anggota' },
  { name: 'Bintang', role: 'Anggota' },
  { name: 'Pak Budi', role: 'Tamu' },
]

export const STATUS_MENU_ITEMS: MenuItemData[] = STATUSES.map((s) => ({
  status: s.key,
  selected: s.key === 'progress',
}))

export const MOVE_ITEMS: MenuItemData[] = [
  { avatar: 'Rama', label: 'Rama', meta: '6 aktif', selected: true },
  { avatar: 'Galih', label: 'Galih', meta: '2 aktif' },
  { avatar: 'Bintang', label: 'Bintang', meta: '5 aktif' },
]

/** 21 hari mulai Senin 21 Sep 2026; hari ini (28 Sep) = indeks 7. */
export const GANTT_DAYS = Array.from({ length: 21 }, (_, i) => ({
  weekend: i % 7 === 5 || i % 7 === 6,
}))
export const GANTT_WEEKENDS = GANTT_DAYS.flatMap((d, i) => (d.weekend ? [i] : []))
export const TODAY_INDEX = 7

export const WORKLOAD = [
  { name: 'Rama', counts: [3, 4, 5, 6, 5, 0, 0, 4, 4, 3, 2, 2, 0, 0] },
  { name: 'Galih', counts: [1, 1, 2, 2, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0] },
  { name: 'Wiwiet', counts: [2, 3, 3, 3, 4, 0, 1, 3, 3, 2, 2, 1, 0, 0] },
]
