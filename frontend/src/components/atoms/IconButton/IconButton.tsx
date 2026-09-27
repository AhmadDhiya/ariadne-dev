import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon'
import './IconButton.css'

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  icon: IconName
  /** Wajib: menjadi aria-label dan tooltip. */
  label: string
  /** Angka kecil di pojok (mis. notifikasi belum dibaca). Di atas 99 tampil "99+". */
  badge?: number
  size?: 'md' | 'sm'
}

/** Tombol ikon persegi, bisa dengan badge jumlah. */
export function IconButton({
  icon,
  label,
  badge,
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx('ar-iconbtn', size === 'sm' && 'ar-iconbtn-sm', className)}
      aria-label={badge ? `${label} (${badge})` : label}
      title={label}
    >
      <Icon name={icon} size={size === 'sm' ? 14 : 18} />
      {badge ? (
        <span className="ar-count" aria-hidden>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  )
}
