import { formatShortDate, formatTime, jakartaDateOf, parseDate } from '@/lib/dates'
import type { NotificationItem } from '@/types/api'

export interface NotificationView {
  label: string
  icon: 'at' | 'plus' | 'move' | 'calendar'
  /** Warna bulatan ikon (mockup 10): info = mention, primary = penugasan, muted = dipindahkan, warning = tenggat besok, danger = terlambat. */
  tone: 'info' | 'primary' | 'muted' | 'warning' | 'danger'
  /** Bagian yang ditebalkan: nama pelaku, atau ID task untuk notifikasi dari jadwal harian. */
  who: string
  text: string
  detail: string
  /** "08.55". */
  time: string
}

const where = (item: NotificationItem) => `${item.taskTitle} · ${item.path.join(' / ')}`

/** Kalimat satu notifikasi (bahasa tampilan ada di sini, bukan di server). Sama dengan isi email notifikasi. */
export function notificationView(item: NotificationItem): NotificationView {
  const time = formatTime(item.createdAt)
  switch (item.kind) {
    case 'Mention':
      return {
        label: 'Di-mention',
        icon: 'at',
        tone: 'info',
        who: item.actorName ?? '',
        text: `menyebut Anda di ${item.taskKey}`,
        detail: `“${item.excerpt ?? ''}”`,
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
          ? `${where(item)} · mulai ${formatShortDate(item.startDate)}`
          : where(item),
        time,
      }
    case 'Moved':
      return {
        label: 'Task dipindahkan',
        icon: 'move',
        tone: 'muted',
        who: item.actorName ?? '',
        text: item.fromName
          ? `memindahkan ${item.taskKey} dari ${item.fromName} ke Anda`
          : `memindahkan ${item.taskKey} ke Anda`,
        detail: where(item),
        time,
      }
    case 'DueTomorrow':
      return {
        label: 'Tenggat besok',
        icon: 'calendar',
        tone: 'warning',
        who: item.taskKey,
        text: item.dueDate
          ? `jatuh tempo besok, ${formatShortDate(item.dueDate)}`
          : 'jatuh tempo besok',
        detail: where(item),
        time,
      }
    case 'Overdue':
      return {
        label: 'Terlambat',
        icon: 'calendar',
        tone: 'danger',
        who: item.taskKey,
        text: `lewat tenggat ${item.lateDays} hari`,
        detail: where(item),
        time,
      }
  }
}

export interface NotificationSection {
  label: string
  items: NotificationItem[]
}

function dayBefore(iso: string): string {
  const { year, month, day } = parseDate(iso)
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10)
}

/** Mengelompokkan notifikasi (sudah urut terbaru dulu) per hari Asia/Jakarta: "Hari ini", "Kemarin", lalu "25 Sep". */
export function groupByDay(
  items: readonly NotificationItem[],
  today: string,
): NotificationSection[] {
  const yesterday = dayBefore(today)
  const year = parseDate(today).year
  const sections: NotificationSection[] = []
  for (const item of items) {
    const day = jakartaDateOf(item.createdAt)
    const label =
      day === today ? 'Hari ini' : day === yesterday ? 'Kemarin' : formatShortDate(day, year)
    const last = sections[sections.length - 1]
    if (last?.label === label) last.items.push(item)
    else sections.push({ label, items: [item] })
  }
  return sections
}

/** Tujuan klik notifikasi: tabel proyeknya dengan drawer task terbuka. */
export const notificationHref = (item: NotificationItem) =>
  `/proyek/${item.projectId}/tabel?task=${encodeURIComponent(item.taskKey)}`
