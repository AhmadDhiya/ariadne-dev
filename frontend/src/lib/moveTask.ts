import { formatDateRange, formatShortDate } from '@/lib/dates'
import { addDays } from '@/lib/gantt'
import type { MoveCandidate } from '@/types/api'

/** Beban harian setinggi ini ke atas dianggap padat (warna heatmap 4: "padat" di mockup 06a). */
export const BUSY_PEAK = 4

export interface RankedCandidate extends MoveCandidate {
  /** Jumlah task aktif di semua hari rentang task: ukuran "seberapa longgar". */
  total: number
  /** Penerima dengan beban paling ringan (hanya satu yang ditandai). */
  loosest: boolean
  busy: boolean
}

/**
 * Mengurutkan calon penerima dari yang paling longgar: jumlah beban di rentang task, lalu beban tertinggi, lalu nama.
 * Yang pertama ditandai "paling longgar" bila ada lebih dari satu calon. Orang yang sedang menjadi PIC yang dipindahkan
 * (`fromId`) tidak ikut menjadi calon.
 */
export function rankCandidates(
  candidates: readonly MoveCandidate[],
  fromId: string,
  query = '',
): RankedCandidate[] {
  const needle = query.trim().toLowerCase()
  const ranked = candidates
    .filter((c) => c.userId !== fromId)
    .map((c) => ({
      ...c,
      total: c.counts.reduce((sum, n) => sum + n, 0),
      loosest: false,
      busy: c.peak >= BUSY_PEAK,
    }))
    .sort((a, b) => a.total - b.total || a.peak - b.peak || a.name.localeCompare(b.name, 'id'))
  const first = ranked[0]
  if (first && ranked.length > 1) first.loosest = true
  return needle ? ranked.filter((c) => c.name.toLowerCase().includes(needle)) : ranked
}

/** "1–2" atau "3" bila semua hari sama; null bila tidak ada hari. */
export function loadRange(counts: readonly number[]): string | null {
  if (counts.length === 0) return null
  const low = Math.min(...counts)
  const high = Math.max(...counts)
  return low === high ? String(low) : `${low}–${high}`
}

/** "29 Sep – 1 Okt" untuk rentang `dayCount` hari mulai dari `start`; satu tanggal bila hanya satu hari. */
export function spanLabel(start: string, dayCount: number): string {
  return dayCount <= 1
    ? formatShortDate(start)
    : formatDateRange(start, addDays(start, dayCount - 1))
}

/**
 * Kalimat ringkasan di bawah daftar: "Beban 3 hari (29 Sep – 1 Okt). Galih paling longgar: 1–2 task aktif per hari."
 * Kosong bila rentang atau pilihan belum ada.
 */
export function loadSummary(
  start: string,
  dayCount: number,
  selected: RankedCandidate | undefined,
): string {
  if (!selected) return ''
  const range = loadRange(selected.counts)
  const load = range === null ? '' : `: ${range} task aktif per hari`
  return `Beban ${dayCount} hari (${spanLabel(start, dayCount)}). ${selected.name}${selected.loosest ? ' paling longgar' : ''}${load}.`
}

/** "Rama dan Galih" / "Rama, Galih, dan Manto". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} dan ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, dan ${names[names.length - 1]}`
}
