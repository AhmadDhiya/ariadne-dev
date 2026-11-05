import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './GanttTrack.css'

export interface GanttTrackProps {
  days: { weekend?: boolean }[]
  /** Lebar satu hari: 28 (Hari), 12 (Minggu), 4 (Bulan). */
  dayWidth?: number
  height?: number
  /**
   * Kolom grid dalam px, menggantikan satu kolom per hari: zoom Minggu (garis per pekan) dan Bulan (garis per bulan)
   * hanya menggambar pemisah kolomnya, tanpa garis harian.
   */
  columns?: readonly { left: number; width: number; weekend?: boolean }[]
  /** GanttBar, Milestone, dan TodayMarker yang diletakkan absolut di atas grid. */
  children?: ReactNode
}

/** Grid hari pada Gantt; akhir pekan diarsir. */
export function GanttTrack({
  days,
  dayWidth = 28,
  height = 36,
  columns,
  children,
}: GanttTrackProps) {
  const cells =
    columns ?? days.map((d, i) => ({ left: i * dayWidth, width: dayWidth, weekend: d.weekend }))
  const width = columns ? cells.reduce((sum, c) => sum + c.width, 0) : days.length * dayWidth
  return (
    <div className="ar-track" style={{ width, height }}>
      {cells.map((c, i) => (
        <span
          key={i}
          className={cx('ar-track-day', c.weekend && 'is-weekend')}
          style={{ left: c.left, width: c.width }}
        />
      ))}
      {children}
    </div>
  )
}
