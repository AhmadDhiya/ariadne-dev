import { cx } from '@/lib/cx'
import './HeatCell.css'

export interface HeatCellProps {
  /** Jumlah task aktif hari itu (dihitung di server). */
  count: number
  width?: number
  weekend?: boolean
}

/**
 * Satu kotak heatmap beban kerja. Skala heat-0 … heat-5 (5+). Angka selalu dicetak,
 * jadi beban tidak pernah dibaca dari warna saja.
 */
export function HeatCell({ count, width, weekend }: HeatCellProps) {
  const step = Math.min(Math.max(count, 0), 5)
  return (
    <span
      className={cx('ar-heat', `ar-heat-${step}`, weekend && 'is-weekend')}
      style={width !== undefined ? { width } : undefined}
      title={`${count} task aktif`}
    >
      {/* Kotak sempit (zoom Hari) menulis "9+"; kotak pekan/bulan cukup lebar untuk angka sebenarnya */}
      {count > 0 ? (count > 9 && (width ?? 0) < 28 ? '9+' : count) : ''}
    </span>
  )
}
