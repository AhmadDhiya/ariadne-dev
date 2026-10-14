import type { ComponentProps } from 'react'
import { cx } from '@/lib/cx'
import './TextArea.css'

export interface TextAreaProps extends ComponentProps<'textarea'> {
  invalid?: boolean
}

/** Input teks banyak baris (keterangan, komentar, alasan tertahan). */
export function TextArea({ invalid, className, rows = 3, ...rest }: TextAreaProps) {
  return (
    <textarea
      {...rest}
      rows={rows}
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      className={cx('ar-textarea', className)}
    />
  )
}
