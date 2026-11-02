import { formatShortDate, parseDate } from '@/lib/dates'
import type { TimelineZoom } from '@/types/api'

/** Lebar satu hari per zoom (px): Hari 40 (mockup 02), Minggu 12, Bulan 4 (design system). */
export const DAY_WIDTH: Record<TimelineZoom, number> = { day: 40, week: 12, month: 4 }

/**
 * Berapa hari sebelum "hari ini" yang dibiarkan terlihat di tepi kiri saat grafik digulir ke hari ini
 * (mockup 04: hari ini di kolom ke-8 pada zoom Hari).
 */
export const TODAY_SCROLL_OFFSET: Record<TimelineZoom, number> = { day: 7, week: 14, month: 30 }

export const ZOOM_LABELS: Record<TimelineZoom, string> = {
  day: 'Hari',
  week: 'Minggu',
  month: 'Bulan',
}

const WEEKDAY_LETTER = ['M', 'S', 'S', 'R', 'K', 'J', 'S'] // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export interface GanttDay {
  /** "YYYY-MM-DD" */
  date: string
  weekend: boolean
  /** Huruf hari: S (Senin), S, R, K, J, S, M. */
  letter: string
  dayOfMonth: number
  /** 1 = Senin … 7 = Minggu. */
  weekday: number
}

function toUtc(iso: string): number {
  const { year, month, day } = parseDate(iso)
  return Date.UTC(year, month - 1, day)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Tanggal ("YYYY-MM-DD") `offset` hari setelah `iso`. Dihitung dengan UTC supaya tidak bergeser karena zona waktu. */
export function addDays(iso: string, offset: number): string {
  return new Date(toUtc(iso) + offset * DAY_MS).toISOString().slice(0, 10)
}

/** Selisih hari kalender `date` terhadap `start` (negatif bila sebelum). */
export function dayIndex(start: string, date: string): number {
  return Math.round((toUtc(date) - toUtc(start)) / DAY_MS)
}

/** `count` hari berturut-turut mulai dari `start`, dengan penanda akhir pekan dan huruf hari. */
export function ganttDays(start: string, count: number): GanttDay[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i)
    const dow = new Date(toUtc(date)).getUTCDay()
    return {
      date,
      weekend: dow === 0 || dow === 6,
      letter: WEEKDAY_LETTER[dow] ?? '',
      dayOfMonth: parseDate(date).day,
      weekday: dow === 0 ? 7 : dow,
    }
  })
}

export interface HeaderSegment {
  label: string
  /** Indeks hari pertama segmen. */
  from: number
  /** Jumlah hari. */
  span: number
}

/**
 * Judul kolom di atas grafik: tiap hari (zoom Hari), tiap pekan yang diberi tanggal Seninnya (Minggu), atau tiap bulan (Bulan).
 */
export function headerSegments(days: readonly GanttDay[], zoom: TimelineZoom): HeaderSegment[] {
  if (zoom === 'day') {
    return days.map((d, i) => ({ label: String(d.dayOfMonth), from: i, span: 1 }))
  }

  const segments: HeaderSegment[] = []
  days.forEach((d, i) => {
    const { year, month } = parseDate(d.date)
    const startsSegment =
      zoom === 'week' ? d.weekday === 1 || i === 0 : d.dayOfMonth === 1 || i === 0
    if (startsSegment) {
      const label =
        zoom === 'week'
          ? formatShortDate(d.date)
          : `${MONTHS[month - 1] ?? ''}${i === 0 || month === 1 ? ` ${year}` : ''}`
      segments.push({ label, from: i, span: 1 })
    } else {
      const last = segments[segments.length - 1]
      if (last) last.span += 1
    }
  })
  return segments
}

/**
 * Posisi bar task di grafik: indeks hari mulai dan jumlah hari, dipotong sesuai rentang. Bila hanya satu tanggal ada,
 * bar selebar satu hari; bila di luar rentang atau tanpa tanggal, tidak ada bar (null).
 */
export function barGeometry(
  rangeStart: string,
  dayCount: number,
  start: string | null,
  due: string | null,
): { start: number; span: number } | null {
  const from = start ?? due
  const to = due ?? start
  if (!from || !to) return null
  const first = dayIndex(rangeStart, from)
  const last = dayIndex(rangeStart, to)
  if (last < 0 || first > dayCount - 1) return null
  const clippedFirst = Math.max(first, 0)
  const clippedLast = Math.min(last, dayCount - 1)
  return { start: clippedFirst, span: clippedLast - clippedFirst + 1 }
}

/** "21 Sep – 11 Okt" untuk rentang `dayCount` hari mulai dari `start`. */
export function rangeLabel(start: string, dayCount: number): string {
  return `${formatShortDate(start)} – ${formatShortDate(addDays(start, dayCount - 1))}`
}

export interface LayoutRow<G, T> {
  kind: 'group' | 'task'
  group: G
  task?: T
  /** Jarak dari atas daftar (px). */
  top: number
}

/**
 * Baris grafik dari atas ke bawah: tiap grup diikuti task-nya, kecuali grup yang dilipat. Tinggi total dikembalikan juga,
 * karena bar digambar absolut mengikuti `top` baris tasknya.
 */
export function layoutRows<G extends { id: string; tasks: readonly T[] }, T>(
  groups: readonly G[],
  collapsed: ReadonlySet<string>,
  groupHeight: number,
  taskHeight: number,
): { rows: LayoutRow<G, T>[]; height: number } {
  const rows: LayoutRow<G, T>[] = []
  let top = 0
  for (const group of groups) {
    rows.push({ kind: 'group', group, top })
    top += groupHeight
    if (collapsed.has(group.id)) continue
    for (const task of group.tasks) {
      rows.push({ kind: 'task', group, task, top })
      top += taskHeight
    }
  }
  return { rows, height: top }
}
