import type { ComponentProps, CSSProperties } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { Kbd } from '@/components/atoms/Kbd'
import { cx } from '@/lib/cx'
import './SearchField.css'

export interface SearchFieldProps extends Omit<
  ComponentProps<'input'>,
  'type' | 'onChange' | 'size' | 'width'
> {
  onValueChange?: (value: string) => void
  /** Petunjuk tombol pintas, mis. "/" untuk pencarian global. */
  shortcut?: string
  /** 360 di topbar, 220 di filter bar proyek. */
  width?: CSSProperties['width']
}

/** Kotak pencarian dengan ikon kaca pembesar. */
export function SearchField({
  placeholder = 'Cari task, proyek, orang…',
  onValueChange,
  shortcut,
  width,
  className,
  ...rest
}: SearchFieldProps) {
  return (
    <label
      className={cx('ar-search', className)}
      style={width !== undefined ? { width } : undefined}
    >
      <Icon name="search" size={16} />
      <input
        aria-label={placeholder}
        {...rest}
        type="search"
        placeholder={placeholder}
        onChange={onValueChange ? (e) => onValueChange(e.target.value) : undefined}
      />
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </label>
  )
}
