import { Avatar } from '@/components/atoms/Avatar'
import { HeatCell } from '@/components/atoms/HeatCell'
import './WorkloadRow.css'

export interface WorkloadRowProps {
  /** Kosongkan untuk baris beban kerja pribadi di dashboard. */
  name?: string
  /** Jumlah task aktif per hari (dihitung di server). */
  counts: number[]
  /** Indeks hari akhir pekan. */
  weekends?: number[]
  dayWidth?: number
}

/** Beban kerja satu orang per hari sebagai heatmap, sejajar dengan kolom Gantt di atasnya. */
export function WorkloadRow({ name, counts, weekends = [], dayWidth = 28 }: WorkloadRowProps) {
  const weekendSet = new Set(weekends)
  return (
    <div className="ar-load">
      {name ? (
        <span className="ar-load-name">
          <Avatar name={name} size={20} />
          <span>{name}</span>
        </span>
      ) : null}
      <div className="ar-load-cells">
        {counts.map((count, i) => (
          <HeatCell key={i} count={count} width={dayWidth - 2} weekend={weekendSet.has(i)} />
        ))}
      </div>
    </div>
  )
}
