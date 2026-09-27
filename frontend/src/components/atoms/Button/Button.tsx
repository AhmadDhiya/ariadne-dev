import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import { Icon, type IconName } from '../Icon'
import './Button.css'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  icon?: IconName
  iconEnd?: IconName
}

/** Tombol aksi. Hanya satu `primary` per tampilan. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconEnd,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 14 : 16
  return (
    <button
      {...rest}
      type={type}
      className={cx('ar-btn', `ar-btn-${variant}`, `ar-btn-${size}`, className)}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children ? <span>{children}</span> : null}
      {iconEnd ? <Icon name={iconEnd} size={iconSize} /> : null}
    </button>
  )
}
