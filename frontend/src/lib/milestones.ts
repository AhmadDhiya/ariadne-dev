import { formatShortDate } from '@/lib/dates'
import type { MilestoneItem } from '@/types/api'

/** "UAT SLMS · 5 Okt": nama dan tanggal, seperti label di Gantt (tahun ditulis bila bukan tahun ini). */
export function milestoneLabel(
  milestone: Pick<MilestoneItem, 'name' | 'date'>,
  currentYear?: number,
): string {
  return `${milestone.name} · ${formatShortDate(milestone.date, currentYear)}`
}

/** Jalur sub-proyek tanpa nama proyek root ("SLMS / Temuan UAT"); kosong bila milestone ada di proyek root. */
export function milestonePlace(milestone: Pick<MilestoneItem, 'path'>): string {
  return milestone.path.slice(1).join(' / ')
}
