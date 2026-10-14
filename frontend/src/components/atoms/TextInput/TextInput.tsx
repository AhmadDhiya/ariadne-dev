import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import './TextInput.css'

export interface TextInputProps extends Omit<ComponentProps<'input'>, 'size'> {
  /** `md` 32px (default), `lg` 40px untuk form Login. */
  size?: 'md' | 'lg'
  invalid?: boolean
}

/** Input teks satu baris. Pakai di dalam FormField supaya punya label. */
export function TextInput({
  size = 'md',
  invalid,
  className,
  type = 'text',
  ...rest
}: TextInputProps) {
  return (
    <input
      {...rest}
      type={type}
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      className={cx('ar-input', size === 'lg' && 'ar-input-lg', className)}
    />
  )
}
