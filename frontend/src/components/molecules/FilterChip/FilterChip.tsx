import type { ComponentProps } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { cx } from '@/lib/cx'
import './FilterChip.css'

export interface FilterChipProps extends Omit<ComponentProps<'button'>, 'children' | 'value'> {
  label: string
  /** Nilai terpilih, tampil sebagai "PIC: Ahmad". */
  value?: string
  /** Jumlah nilai terpilih. */
  count?: number
  /** Chip nyala/mati tanpa caret (Terlambat, Minggu ini, Task saya). */
  toggle?: boolean
  active?: boolean
}

/** Filter di filter bar proyek dan Timeline Tim: dropdown atau toggle. Aktif ditandai centang, bukan warna saja. */
export function FilterChip({
  label,
  value,
  count,
  toggle,
  active,
  className,
  type = 'button',
  ...rest
}: FilterChipProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx('ar-chip', active && 'is-active', className)}
      aria-pressed={toggle ? Boolean(active) : undefined}
      aria-haspopup={toggle ? undefined : 'listbox'}
    >
      {toggle && active ? <Icon name="check" size={14} /> : null}
      <span>
        {label}
        {value ? <b>: {value}</b> : null}
      </span>
      {count ? <span className="ar-chip-count">{count}</span> : null}
      {toggle ? null : <Icon name="chevron-down" size={14} />}
    </button>
  )
}
