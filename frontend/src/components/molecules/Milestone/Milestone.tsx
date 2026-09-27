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
}

/** Milestone: belah ketupat ink (berlubang bila selesai) dengan label tebal. */
export function Milestone({ day, label, done, top = 10, dayWidth = 28 }: MilestoneProps) {
  return (
    <div className="ar-ms" style={{ left: day * dayWidth + dayWidth / 2, top }}>
      <span className={cx('ar-ms-diamond', done && 'is-done')} aria-hidden />
      <span className="ar-ms-label">
        {label}
        {done ? <VisuallyHidden> (selesai)</VisuallyHidden> : null}
      </span>
    </div>
  )
}
