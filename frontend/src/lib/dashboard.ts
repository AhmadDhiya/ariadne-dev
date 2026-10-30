import { formatActivityTime, formatShortDate } from '@/lib/dates'
import { getStatus, getPriority, priorityFromApi, statusFromApi } from '@/lib/status'
import type {
  AttentionItem,
  DashboardCard,
  DashboardSummary,
  TaskRow,
  TodayGroupName,
} from '@/types/api'

/** Kartu ringkasan, urut seperti di layar. Kunci kartu dipakai di alamat halaman (?kartu=terlambat). */
export const CARD_KEYS: readonly DashboardCard[] = ['terlambat', 'minggu', 'dikerjakan', 'tertahan']

export function isCard(value: string | null): value is DashboardCard {
  return value !== null && (CARD_KEYS as readonly string[]).includes(value)
}

export const GROUP_LABELS: Record<TodayGroupName, string> = {
  Overdue: 'Terlambat',
  DueToday: 'Jatuh tempo hari ini',
  InProgress: 'Sedang berjalan',
  Upcoming: 'Mendatang',
}

/** "Selamat pagi, Ahmad". */
export const greeting = (dayPart: string, name: string) => `Selamat ${dayPart}, ${name}`

/** "1 Critical · 1 High": rincian prioritas task yang terlambat. */
export function lateHint(summary: DashboardSummary): string {
  if (summary.late === 0) return 'Tidak ada yang terlambat'
  return summary.lateByPriority
    .map((p) => `${p.count} ${getPriority(priorityFromApi(p.priority)).label}`)
    .join(' · ')
}

/** "s.d. Jumat, 2 Okt". */
export const weekHint = (weekEnd: string) => `s.d. Jumat, ${formatShortDate(weekEnd)}`

/** "di 2 proyek". */
export const workingHint = (projects: number) =>
  projects === 0 ? 'Tidak ada yang berjalan' : `di ${projects} proyek`

/** "Blocked 1 · On Request 1": rincian status tertahan. */
export function heldHint(summary: DashboardSummary): string {
  if (summary.held === 0) return 'Tidak ada yang tertahan'
  return summary.heldByStatus
    .map((s) => `${getStatus(statusFromApi(s.status)).label} ${s.count}`)
    .join(' · ')
}

export interface DueView {
  text: string
  overdue: boolean
  lateDays: number
}

/** Tenggat di baris Hari Ini: "Hari ini", "30 Sep", atau "25 Sep" dengan "telat 3 hari" bila terlambat. */
export function dueView(
  task: Pick<TaskRow, 'dueDate' | 'isOverdue' | 'lateDays'>,
  today: string,
): DueView {
  if (!task.dueDate) return { text: '—', overdue: false, lateDays: 0 }
  const year = Number(today.slice(0, 4))
  const text = task.dueDate === today ? 'Hari ini' : formatShortDate(task.dueDate, year)
  return { text, overdue: task.isOverdue, lateDays: task.isOverdue ? task.lateDays : 0 }
}

export interface AttentionView {
  label: string
  icon: 'at' | 'plus' | 'calendar'
  /** Warna bulatan ikon: info (mention), primary (penugasan), danger (terlambat), muted (tenggat besok). */
  tone: 'info' | 'primary' | 'danger' | 'muted'
  who: string
  text: string
  detail: string | null
  /** "08.55", "Kemarin", atau kosong untuk butir yang dihitung dari tenggat. */
  time: string | null
}

/** Menyusun kalimat butir "Perlu perhatian" dari datanya (bahasa tampilan ada di sini, bukan di server). */
export function attentionView(item: AttentionItem, today: string): AttentionView {
  const time = item.at ? formatActivityTime(item.at, today) : null
  switch (item.kind) {
    case 'Mention':
      return {
        label: 'Di-mention',
        icon: 'at',
        tone: 'info',
        who: item.actorName ?? '',
        text: `menyebut Anda di ${item.taskKey}`,
        detail: item.detail ? `“${item.detail}”` : null,
        time,
      }
    case 'Assigned':
      return {
        label: 'Task baru ditugaskan',
        icon: 'plus',
        tone: 'primary',
        who: item.actorName ?? '',
        text: `menugaskan ${item.taskKey} ke Anda`,
        detail: item.startDate
          ? `${item.taskTitle} · mulai ${formatShortDate(item.startDate)}`
          : item.taskTitle,
        time,
      }
    case 'DueTomorrow':
      return {
        label: 'Tenggat besok',
        icon: 'calendar',
        tone: 'muted',
        who: item.taskKey,
        text: 'jatuh tempo besok',
        detail: item.taskTitle,
        time,
      }
    case 'Overdue':
      return {
        label: 'Terlambat',
        icon: 'calendar',
        tone: 'danger',
        who: item.taskKey,
        text: `lewat tenggat ${item.lateDays} hari`,
        detail: item.taskTitle,
        time,
      }
  }
}
