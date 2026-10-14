import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './GanttTrack.css'

export interface GanttTrackProps {
  days: { weekend?: boolean }[]
  /** Lebar satu hari: 28 (Hari), 12 (Minggu), 4 (Bulan). */
  dayWidth?: number
  height?: number
  /** GanttBar, Milestone, dan TodayMarker yang diletakkan absolut di atas grid. */
  children?: ReactNode
}

/** Grid hari pada Gantt; akhir pekan diarsir. */
export function GanttTrack({ days, dayWidth = 28, height = 36, children }: GanttTrackProps) {
  return (
    <div className="ar-track" style={{ width: days.length * dayWidth, height }}>
      {days.map((d, i) => (
        <span
          key={i}
          className={cx('ar-track-day', d.weekend && 'is-weekend')}
          style={{ left: i * dayWidth, width: dayWidth }}
        />
      ))}
      {children}
    </div>
  )
}
