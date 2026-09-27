import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { getStatus, type StatusKey } from '@/lib/status'
import { Icon } from '../Icon'
import './StatusPill.css'

export interface StatusPillProps extends Omit<ComponentProps<'button'>, 'children'> {
  status: StatusKey
  /** Tampil sebagai tombol dengan caret untuk edit langsung (membuka Menu status). */
  select?: boolean
  /** Keadaan tertekan saat Menu-nya terbuka. */
  open?: boolean
}

/**
 * Satu-satunya cara menampilkan status: ikon + nama, dengan warna soft/ink status itu.
 * Tidak pernah hanya warna (pedoman brand "Never colour alone").
 */
export function StatusPill({
  status,
  select,
  open,
  className,
  type = 'button',
  ...rest
}: StatusPillProps) {
  const st = getStatus(status)
  const classes = cx(
    'ar-pill',
    `ar-pill-${st.key}`,
    select && 'ar-pill-select',
    open && 'is-open',
    className,
  )
  const content = (
    <>
      <Icon name={`status-${st.key}`} size={14} />
      <span>{st.label}</span>
    </>
  )

  if (!select) {
    return <span className={classes}>{content}</span>
  }

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      aria-haspopup="listbox"
      aria-expanded={Boolean(open)}
      aria-label={rest['aria-label'] ?? `Ubah status: ${st.label}`}
    >
      {content}
      <Icon name="chevron-down" size={12} className="ar-pill-caret" />
    </button>
  )
}
