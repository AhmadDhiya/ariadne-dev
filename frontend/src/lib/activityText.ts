import { formatShortDate } from '@/lib/dates'
import { getStatus, statusFromApi, type StatusKey } from '@/lib/status'
import type { ActivityData, ActivityItem, WorkStatusName } from '@/types/api'

export interface LogLine {
  /** Kalimat setelah nama penulis, mis. "mengubah status On Progress → Blocked". */
  text: string
  icon: 'plus' | 'users' | 'calendar' | 'move' | `status-${StatusKey}`
}

const statusLabel = (name: string | undefined) =>
  name ? getStatus(statusFromApi(name as WorkStatusName)).label : '?'

/** "A", "A dan B", "A, B, dan C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  const head = names.slice(0, -1).join(', ')
  return `${head}${names.length > 2 ? ',' : ''} dan ${names[names.length - 1] ?? ''}`
}

function dateSpan(start: string | undefined, due: string | undefined): string {
  if (start && due) return `${formatShortDate(start)} – ${formatShortDate(due)}`
  if (due) return `selesai ${formatShortDate(due)}`
  if (start) return `mulai ${formatShortDate(start)}`
  return 'tanpa tanggal'
}

function assignees(data: ActivityData): string {
  const added = data.added ?? []
  const removed = data.removed ?? []
  if (added.length > 0 && removed.length > 0) {
    return `mengganti PIC ${joinNames(removed)} → ${joinNames(added)}`
  }
  if (added.length > 0) return `menambahkan ${joinNames(added)} sebagai PIC`
  return `menghapus ${joinNames(removed)} dari PIC`
}

/**
 * Kalimat untuk entri Log otomatis ("Wiwiet mengubah status On Progress → Blocked"). Data terstruktur dari server
 * diubah menjadi kalimat di sini, sehingga bahasa tampilan tetap satu tempat dan riwayat tidak bergantung pada
 * kalimat yang pernah tersimpan.
 */
export function logLine(item: Pick<ActivityItem, 'logKind' | 'data'>): LogLine {
  const data = item.data ?? {}
  switch (item.logKind) {
    case 'TaskCreated': {
      const people = data.added ?? []
      return {
        text:
          people.length > 0
            ? `membuat task ini dan menugaskan ${joinNames(people)}`
            : 'membuat task ini',
        icon: 'plus',
      }
    }
    case 'StatusChanged':
      return {
        text: `mengubah status ${statusLabel(data.from)} → ${statusLabel(data.to)}`,
        icon: data.to ? (`status-${statusFromApi(data.to as WorkStatusName)}` as const) : 'move',
      }
    case 'AssigneesChanged':
      return { text: assignees(data), icon: 'users' }
    case 'DatesChanged':
      return {
        text: `mengubah tanggal ${dateSpan(data.fromStart, data.fromDue)} → ${dateSpan(data.toStart, data.toDue)}`,
        icon: 'calendar',
      }
    case 'SubtaskAdded':
      return {
        text: `menambahkan sub-task ${data.key ?? ''} ${data.title ?? ''}`.trim(),
        icon: 'plus',
      }
    default:
      return { text: 'mengubah task ini', icon: 'move' }
  }
}
