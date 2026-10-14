import type { ReactNode } from 'react'
import './AppShell.css'

export interface AppShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  /** Strip konteks di bawah topbar (Banner "Anda melihat sebagai Tamu"). */
  banner?: ReactNode
  children: ReactNode
}

/**
 * Kerangka halaman setelah login: sidebar 248px di kiri; topbar, banner opsional, dan konten di kanan.
 * "Lewati ke konten" muncul saat Tab pertama supaya pengguna keyboard tidak melewati seluruh sidebar.
 */
export function AppShell({ sidebar, topbar, banner, children }: AppShellProps) {
  return (
    <div className="ar-shell">
      <a className="ar-skip" href="#konten">
        Lewati ke konten
      </a>
      <aside className="ar-shell-side">{sidebar}</aside>
      <div className="ar-shell-main">
        {topbar}
        {banner}
        <main id="konten" className="ar-shell-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
