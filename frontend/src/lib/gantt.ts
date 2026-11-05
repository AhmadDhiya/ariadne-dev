import { formatShortDate, parseDate } from '@/lib/dates'
import { getStatus, type StatusKey } from '@/lib/status'
import type { TimelineZoom } from '@/types/api'

/**
 * Ukuran kolom per zoom (px). Hari: 40 per hari (mockup 02, tidak berubah). Minggu: satu kolom per pekan Senin–Minggu
 * selebar 112 (16 per hari). Bulan: satu kolom per bulan kalender selebar 160, dibagi rata ke jumlah hari bulan itu
 * (28–31), jadi posisi bar tetap sesuai tanggal sebenarnya. Grafik tidak dipaksa muat; digulir ke samping.
 */
export const DAY_COLUMN = 40
export const WEEK_COLUMN = 112
export const MONTH_COLUMN = 160

/** Jarak (px) dari tepi kiri ke "hari ini" saat grafik digulir ke hari ini: 7 hari (mockup 04), 2 pekan, atau 1 bulan. */
export const TODAY_SCROLL_OFFSET: Record<TimelineZoom, number> = {
  day: 7 * DAY_COLUMN,
  week: 2 * WEEK_COLUMN,
  month: MONTH_COLUMN,
}

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

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** "2–8 Nov", atau "28 Sep – 4 Okt" bila pekannya melewati pergantian bulan. */
export function weekLabel(first: string, last: string): string {
  const a = parseDate(first)
  const b = parseDate(last)
  return a.month === b.month && a.year === b.year
    ? `${a.day}–${b.day} ${MONTHS[b.month - 1] ?? ''}`
    : `${formatShortDate(first)} – ${formatShortDate(last)}`
}

export interface ScaleColumn {
  label: string
  /** Indeks hari pertama kolom dan jumlah harinya. */
  from: number
  span: number
  /** Letak dan lebar kolom (px). */
  left: number
  width: number
  /** Hanya zoom Hari: kolom akhir pekan diarsir. */
  weekend: boolean
}

export interface TimeScale {
  /** Lebar seluruh grafik (px). */
  width: number
  /** Kolom grid dan judulnya: tiap hari, tiap pekan Senin–Minggu, atau tiap bulan kalender. */
  columns: ScaleColumn[]
  /** Tepi kiri hari ke-`index` (px). `index` = jumlah hari berarti tepi kanan grafik. */
  x: (index: number) => number
  /** Lebar satu hari ke-`index` (px); di zoom Bulan berbeda per bulan. */
  dayWidth: (index: number) => number
}

/**
 * Skala waktu grafik untuk zoom ini. Semua yang digambar (bar, milestone, garis hari ini, judul, beban kerja) memakai
 * skala yang sama, jadi selalu sejajar. Kolom sama persis dengan TimelineRange.Columns di server (beban per kolom).
 */
export function timeScale(days: readonly GanttDay[], zoom: TimelineZoom): TimeScale {
  const widths = days.map((d) => {
    if (zoom === 'day') return DAY_COLUMN
    if (zoom === 'week') return WEEK_COLUMN / 7
    const { year, month } = parseDate(d.date)
    return MONTH_COLUMN / daysInMonth(year, month)
  })
  // Tepi tiap hari dihitung dari awal kolomnya (bukan dijumlah terus), supaya tepi pekan/bulan tepat tanpa sisa pembulatan
  const edges = [0]
  let columnLeft = 0
  let inColumn = 0
  days.forEach((d, i) => {
    const startsColumn =
      i === 0 || zoom === 'day' || (zoom === 'week' ? d.weekday === 1 : d.dayOfMonth === 1)
    if (startsColumn) {
      columnLeft = edges[i] ?? 0
      inColumn = 0
    }
    inColumn += 1
    edges.push(columnLeft + inColumn * (widths[i] ?? 0))
  })
  const x = (index: number) => edges[Math.min(Math.max(index, 0), widths.length)] ?? 0

  const columns: ScaleColumn[] = []
  days.forEach((d, i) => {
    const { year, month } = parseDate(d.date)
    const starts =
      zoom === 'day' || i === 0 || (zoom === 'week' ? d.weekday === 1 : d.dayOfMonth === 1)
    if (starts) {
      const label =
        zoom === 'day'
          ? String(d.dayOfMonth)
          : zoom === 'month'
            ? `${MONTHS[month - 1] ?? ''} ${year}`
            : ''
      columns.push({
        label,
        from: i,
        span: 1,
        left: x(i),
        width: 0,
        weekend: zoom === 'day' && d.weekend,
      })
    } else {
      const last = columns[columns.length - 1]
      if (last) last.span += 1
    }
  })
  for (const column of columns) {
    column.width = x(column.from + column.span) - column.left
    if (zoom === 'week') {
      const first = days[column.from]?.date ?? ''
      const last = days[column.from + column.span - 1]?.date ?? first
      column.label = weekLabel(first, last)
    }
  }

  return { width: x(days.length), columns, x, dayWidth: (index) => widths[index] ?? 0 }
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

/** Tooltip bar di zoom Minggu/Bulan: "SEN-115 Pipeline GitLab IRS · Blocked · terlambat · PIC: Ahmad, Wiwiet". */
export function barTooltip(task: {
  key: string
  title: string
  status: StatusKey
  overdue: boolean
  assignees?: readonly string[]
}): string {
  const parts = [`${task.key} ${task.title}`, getStatus(task.status).label]
  if (task.overdue) parts.push('terlambat')
  if (task.assignees && task.assignees.length > 0) parts.push(`PIC: ${task.assignees.join(', ')}`)
  return parts.join(' · ')
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
