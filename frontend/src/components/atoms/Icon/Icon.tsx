import type { CSSProperties } from 'react'
import { cx } from '@/lib/cx'
import { ICONS, type IconName, type Shape } from './icons'
import './Icon.css'

export interface IconProps {
  name: IconName
  size?: number
  /** Memberi nama untuk pembaca layar. Kosongkan bila ada teks di sebelahnya. */
  title?: string
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}

/** Ikon garis di grid 24px, digambar dengan currentColor. */
export function Icon({ name, size = 16, title, strokeWidth, className, style }: IconProps) {
  const shapes: readonly Shape[] = ICONS[name]
  const width = strokeWidth ?? (name.startsWith('priority-') ? 2.5 : 1.75)
  return (
    <svg
      className={cx('ar-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {shapes.map(([Tag, attrs], i) => (
        <Tag key={i} {...attrs} />
      ))}
    </svg>
  )
}
