import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/atoms/Icon'
import './Banner.css'

export interface BannerProps {
  /** `guest` = "Anda melihat sebagai Tamu"; `viewing` = "Melihat dashboard: [nama]". */
  kind: 'guest' | 'viewing'
  children: ReactNode
  /** Teks tombol di kanan, mis. "Kembali ke dashboard saya". */
  action?: string
  onAction?: () => void
  icon?: IconName
}

/** Strip konteks di bawah topbar: sedang melihat lewat mata siapa. Bukan untuk error atau peringatan. */
export function Banner({ kind, children, action, onAction, icon }: BannerProps) {
  return (
    <div className="ar-banner" role="status">
      <Icon name={icon ?? (kind === 'guest' ? 'eye' : 'users')} size={16} />
      <span className="ar-banner-text">{children}</span>
      {action ? (
        <button type="button" className="ar-banner-action" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  )
}
