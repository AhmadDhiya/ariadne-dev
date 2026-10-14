import type { ReactNode } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { IconButton } from '@/components/atoms/IconButton'
import { cx } from '@/lib/cx'
import './Toast.css'

export interface ToastProps {
  kind: 'success' | 'error' | 'info'
  children: ReactNode
  onClose?: () => void
}

/** Pesan singkat setelah aksi ("Status disimpan", "Gagal menyimpan, coba lagi"). */
export function Toast({ kind, children, onClose }: ToastProps) {
  return (
    <div
      className={cx('ar-toast', `ar-toast-${kind}`)}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <Icon name={kind === 'success' ? 'check' : 'info'} size={16} />
      <span className="ar-toast-text">{children}</span>
      {onClose ? <IconButton icon="x" size="sm" label="Tutup pesan" onClick={onClose} /> : null}
    </div>
  )
}
