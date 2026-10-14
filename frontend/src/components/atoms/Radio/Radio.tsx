import type { ComponentProps, ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Radio.css'

export interface RadioProps extends Omit<ComponentProps<'input'>, 'type'> {
  /** Kosongkan bila label ditampilkan di luar (mis. di dalam RadioCard). */
  label?: ReactNode
}

/** Tombol pilihan tunggal. */
export function Radio({ label, className, ...rest }: RadioProps) {
  if (label === undefined) {
    return <input {...rest} type="radio" className={cx('ar-radio-input', className)} />
  }
  return (
    <label className={cx('ar-radio', className)}>
      <input {...rest} type="radio" className="ar-radio-input" />
      <span>{label}</span>
    </label>
  )
}
