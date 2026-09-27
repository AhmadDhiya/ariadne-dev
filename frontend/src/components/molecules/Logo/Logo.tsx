import { Mark } from '@/components/atoms/Mark'
import { cx } from '@/lib/cx'
import './Logo.css'

export interface LogoProps {
  /** Ukuran tanda dalam px: 28 di sidebar, 40 di kartu login. */
  size?: number
  /** Default "Task Tracker Hub"; `false` menyembunyikannya. */
  subtitle?: string | false
  /** Hanya tanda (sidebar terlipat, header mobile). */
  markOnly?: boolean
  className?: string
}

/** Tanda + nama Ariadne. Jangan diwarnai ulang, diberi wadah, atau dianimasikan. */
export function Logo({ size = 28, subtitle, markOnly, className }: LogoProps) {
  return (
    <span
      className={cx('ar-logo', className)}
      role={markOnly ? 'img' : undefined}
      aria-label={markOnly ? 'Ariadne' : undefined}
    >
      <Mark size={size} />
      {markOnly ? null : (
        <span className="ar-logo-text">
          <span className="ar-logo-name" style={{ fontSize: `${Math.round(size * 0.64)}px` }}>
            Ariadne
          </span>
          {subtitle === false ? null : (
            <span className="ar-logo-sub">{subtitle ?? 'Task Tracker Hub'}</span>
          )}
        </span>
      )}
    </span>
  )
}
