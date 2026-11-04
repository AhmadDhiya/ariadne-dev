import { dayIndex } from '@/lib/gantt'

/** Beban hari ini sebanyak ini (atau lebih) ditandai merah di baris orang (mockup 06: "5 aktif hari ini"). */
export const HEAVY_TODAY = 5

/** Jumlah task aktif orang ini pada hari ini; 0 bila hari ini di luar rentang. */
export function activeToday(counts: readonly number[], rangeStart: string, today: string): number {
  const index = dayIndex(rangeStart, today)
  return index >= 0 && index < counts.length ? (counts[index] ?? 0) : 0
}

export function activeTodayText(count: number): string {
  return `${count} aktif hari ini`
}

/** Nama proyek task untuk baris kecil di bawah judul: "Sentul / Testing Oktober". */
export function pathLabel(path: readonly string[]): string {
  return path.join(' / ')
}

/** "Tim Sentul · 7 orang". */
export function teamLabel(name: string, memberCount: number): string {
  return `${name} · ${memberCount} orang`
}
