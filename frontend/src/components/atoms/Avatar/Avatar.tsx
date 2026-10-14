import { cx } from '@/lib/cx'
import { initials } from '@/lib/initials'
import './Avatar.css'

export interface AvatarProps {
  name: string
  /** 24 di tabel, 28 di aktivitas, 32 di header. */
  size?: number
  /** Tamu selalu bergaris, supaya orang internal tahu siapa yang bisa membaca apa. */
  guest?: boolean
  className?: string
}

/** Inisial dalam lingkaran. Warna tidak pernah membedakan orang; nama ada di tooltip. */
export function Avatar({ name, size = 24, guest, className }: AvatarProps) {
  return (
    <span
      className={cx('ar-avatar', guest && 'is-guest', className)}
      title={name}
      role="img"
      aria-label={guest ? `${name} (Tamu)` : name}
      style={{ width: size, height: size, fontSize: `${Math.round(size * 0.42)}px` }}
    >
      {initials(name)}
    </span>
  )
}
