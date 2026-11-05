import './TodayMarker.css'

export interface TodayMarkerProps {
  /** Indeks hari ini di dalam GanttTrack. */
  day: number
  /** Default "Hari ini"; `false` menyembunyikan label. */
  label?: string | false
  dayWidth?: number
  /** Titik tengah dalam px, menggantikan day × dayWidth (zoom Minggu dan Bulan). */
  x?: number
}

/** Garis "hari ini": benang Ariadne dengan simpul di atas. Satu per chart, selalu warna thread. */
export function TodayMarker({ day, label = 'Hari ini', dayWidth = 28, x }: TodayMarkerProps) {
  return (
    <div className="ar-today" style={{ left: x ?? day * dayWidth + dayWidth / 2 }}>
      <span className="ar-today-knot" />
      {label === false ? null : <span className="ar-today-label">{label}</span>}
    </div>
  )
}
