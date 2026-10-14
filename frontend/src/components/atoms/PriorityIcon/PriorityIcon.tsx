import { cx } from '@/lib/cx'
import { getPriority, type PriorityKey } from '@/lib/status'
import { Icon } from '../Icon'
import './PriorityIcon.css'

export interface PriorityIconProps {
  priority: PriorityKey
  /** Tambahkan kata (dipakai di kolom Prioritas tabel). */
  showLabel?: boolean
  size?: number
  className?: string
}

/** Prioritas sebagai glyph polos, tidak pernah pill atau latar, supaya tidak tertukar dengan status. */
export function PriorityIcon({ priority, showLabel, size = 16, className }: PriorityIconProps) {
  const p = getPriority(priority)
  return (
    <span
      className={cx('ar-prio', `ar-prio-${p.key}`, className)}
      title={showLabel ? undefined : `Prioritas: ${p.label}`}
    >
      <Icon
        name={`priority-${p.key}`}
        size={size}
        title={showLabel ? undefined : `Prioritas ${p.label}`}
      />
      {showLabel ? <span>{p.label}</span> : null}
    </span>
  )
}
