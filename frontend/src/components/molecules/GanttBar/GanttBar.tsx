import { Icon } from '@/components/atoms/Icon'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { cx } from '@/lib/cx'
import { getStatus, type PriorityKey, type StatusKey } from '@/lib/status'
import './GanttBar.css'

export interface GanttBarProps {
  status: StatusKey
  /** Indeks hari mulai di dalam GanttTrack. */
  start: number
  /** Jumlah hari. */
  span: number
  label?: string
  priority?: PriorityKey
  /** Dihitung di server. Bar mendapat cincin merah `danger`. */
  overdue?: boolean
  top?: number
  dayWidth?: number
  /**
   * Letak dan lebar dalam px, menggantikan start/span × dayWidth. Dipakai zoom Minggu dan Bulan, yang lebar harinya
   * tidak sama (bulan 28–31 hari dalam kolom yang sama lebar).
   */
  left?: number
  width?: number
  /** Tooltip saat hover, menggantikan nama status (mis. dengan PIC, bila labelnya tidak ditampilkan). */
  tooltip?: string
}

/** Bar task: warna status + ikon status; label dan ikon prioritas di kanan. */
export function GanttBar({
  status,
  start,
  span,
  label,
  priority,
  overdue,
  top = 8,
  dayWidth = 28,
  left,
  width,
  tooltip,
}: GanttBarProps) {
  const st = getStatus(status)
  const title = tooltip ?? (overdue ? `${st.label} · terlambat` : st.label)
  return (
    <div className="ar-bar-wrap" style={{ left: left ?? start * dayWidth, top }}>
      <div
        className={cx('ar-bar', `ar-bar-${st.key}`, overdue && 'is-overdue')}
        style={{ width: Math.max((width ?? span * dayWidth) - 2, 8) }}
        title={title}
      >
        <Icon name={`status-${st.key}`} size={12} title={tooltip ?? st.label} />
      </div>
      {label ? (
        <span className="ar-bar-label">
          {priority ? <PriorityIcon priority={priority} size={12} /> : null}
          {label}
        </span>
      ) : null}
    </div>
  )
}
