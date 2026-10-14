import type { ComponentProps, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Checkbox.css'

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: ReactNode
}

/** Kotak centang dengan label yang bisa diklik ("Ingat saya di perangkat ini"). */
export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx('ar-check', className)}>
      <input {...rest} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
