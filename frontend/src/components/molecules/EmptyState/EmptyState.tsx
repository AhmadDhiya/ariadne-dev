import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/atoms/Icon'
import './EmptyState.css'

export interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: ReactNode
  /** Tombol aksi, mis. "Tambah task". */
  action?: ReactNode
}

/** Tampilan saat daftar kosong atau data gagal dimuat. */
export function EmptyState({ icon = 'info', title, description, action }: EmptyStateProps) {
  return (
    <div className="ar-empty">
      <span className="ar-empty-icon">
        <Icon name={icon} size={20} />
      </span>
      <p className="ar-empty-title">{title}</p>
      {description ? <p className="ar-empty-desc">{description}</p> : null}
      {action ? <div className="ar-empty-action">{action}</div> : null}
    </div>
  )
}
