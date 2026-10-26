import type { ReactNode } from 'react'
import './ProjectLayout.css'

export interface ProjectLayoutProps {
  breadcrumb: ReactNode
  title: string
  /** Di samping judul: progres proyek dan avatar anggota. */
  meta?: ReactNode
  /** Di kanan atas: tombol aksi. */
  actions?: ReactNode
  /** Tabs Tabel | Gantt | Milestone | Anggota. */
  tabs: ReactNode
  children: ReactNode
}

/** Kerangka halaman proyek (mockup 03, 04, 08): breadcrumb, judul, tombol, tabs, lalu isi tab. */
export function ProjectLayout({
  breadcrumb,
  title,
  meta,
  actions,
  tabs,
  children,
}: ProjectLayoutProps) {
  return (
    <>
      <div className="ar-projhead">
        <div className="ar-projhead-main">
          {breadcrumb}
          <div className="ar-projhead-titlerow">
            <h1 className="ar-projhead-title">{title}</h1>
            {meta}
          </div>
        </div>
        {actions ? <div className="ar-projhead-actions">{actions}</div> : null}
      </div>
      {tabs}
      {children}
    </>
  )
}
