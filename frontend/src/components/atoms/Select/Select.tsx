import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import './Select.css'

export interface SelectProps extends Omit<ComponentProps<'select'>, 'size'> {
  size?: 'md' | 'sm'
}

/** Pilihan bawaan browser (peran Anggota/Supervisor, dll.). Untuk status pakai StatusPill + Menu. */
export function Select({ size = 'md', className, children, ...rest }: SelectProps) {
  return (
    <select {...rest} className={cx('ar-select', size === 'sm' && 'ar-select-sm', className)}>
      {children}
    </select>
  )
}
