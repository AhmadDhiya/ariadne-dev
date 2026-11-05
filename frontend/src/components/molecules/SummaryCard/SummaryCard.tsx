import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/atoms/Icon'
import { cx } from '@/lib/cx'
import './SummaryCard.css'

export interface SummaryCardProps {
  label: string
  /** Label pendek untuk layar sempit (mockup 11), mis. "Minggu ini". */
  shortLabel?: string
  value: ReactNode
  icon?: IconName
  /** `danger` untuk Terlambat (hanya bila > 0), `held` untuk Tertahan. */
  tone?: 'danger' | 'held'
  hint?: ReactNode
  /** Kartu bisa diklik untuk menyaring daftar Hari Ini. */
  onClick?: () => void
  /** Filter kartu ini sedang aktif. */
  active?: boolean
}

/** Satu angka di dashboard pribadi. */
export function SummaryCard({
  label,
  shortLabel,
  value,
  icon,
  tone,
  hint,
  onClick,
  active,
}: SummaryCardProps) {
  const classes = cx('ar-card', 'ar-summary', tone && `is-${tone}`, onClick && 'ar-summary-action')
  const content = (
    <>
      <div className="ar-summary-head">
        {icon ? <Icon name={icon} size={16} /> : null}
        <span className={shortLabel ? 'ar-summary-long' : undefined}>{label}</span>
        {shortLabel ? <span className="ar-summary-short">{shortLabel}</span> : null}
      </div>
      <div className="ar-summary-value">{value}</div>
      {hint ? <div className="ar-summary-hint">{hint}</div> : null}
    </>
  )

  return onClick ? (
    <button type="button" className={classes} onClick={onClick} aria-pressed={Boolean(active)}>
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  )
}
