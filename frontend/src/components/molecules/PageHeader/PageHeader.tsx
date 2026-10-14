import type { ReactNode } from 'react'
import './PageHeader.css'

export interface PageHeaderProps {
  title: string
  description?: ReactNode
  /** Tombol di kanan (satu `primary` per tampilan). */
  actions?: ReactNode
}

/** Judul halaman (20/28) dengan keterangan singkat dan tombol aksi, seperti halaman Tim dan Pengaturan. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="ar-pageheader">
      <div>
        <h1 className="ar-pageheader-title">{title}</h1>
        {description ? <p className="ar-pageheader-desc">{description}</p> : null}
      </div>
      {actions ? <div className="ar-pageheader-actions">{actions}</div> : null}
    </div>
  )
}
