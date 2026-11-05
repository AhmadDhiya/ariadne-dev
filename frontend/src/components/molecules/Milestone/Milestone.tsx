import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { cx } from '@/lib/cx'
import './Milestone.css'

export interface MilestoneProps {
  /** Indeks hari di dalam GanttTrack. */
  day: number
  /** Mis. "UAT SLMS · 5 Okt". */
  label: string
  done?: boolean
  top?: number
  dayWidth?: number
  /** Titik tengah dalam px, menggantikan day × dayWidth (zoom Minggu dan Bulan). */
  x?: number
}

/** Milestone: belah ketupat ink (berlubang bila selesai) dengan label tebal. */
export function Milestone({ day, label, done, top = 10, dayWidth = 28, x }: MilestoneProps) {
  return (
    <div className="ar-ms" style={{ left: x ?? day * dayWidth + dayWidth / 2, top }}>
      <span className={cx('ar-ms-diamond', done && 'is-done')} aria-hidden />
      <span className="ar-ms-label">
        {label}
        {done ? <VisuallyHidden> (selesai)</VisuallyHidden> : null}
      </span>
    </div>
  )
}
