import type { ReactNode } from 'react'
import { useModalDialog } from '@/hooks/useModalDialog'
import './AppShell.css'

export interface AppShellProps {
  sidebar: ReactNode
  topbar: ReactNode
  /** Strip konteks di bawah topbar (Banner "Anda melihat sebagai Tamu"). */
  banner?: ReactNode
  /** Layar sempit: sidebar dibuka sebagai panel geser dari kiri (tombol menu di topbar). */
  navOpen?: boolean
  onNavClose?: () => void
  children: ReactNode
}

/**
 * Kerangka halaman setelah login: sidebar 248px di kiri; topbar, banner opsional, dan konten di kanan.
 * "Lewati ke konten" muncul saat Tab pertama supaya pengguna keyboard tidak melewati seluruh sidebar.
 * Di layar < 768px (mockup 11) sidebar disembunyikan dan dibuka lewat tombol menu, di atas latar `overlay`.
 */
export function AppShell({
  sidebar,
  topbar,
  banner,
  navOpen = false,
  onNavClose,
  children,
}: AppShellProps) {
  const { ref, visible } = useModalDialog(navOpen)

  return (
    <div className="ar-shell">
      <a className="ar-skip" href="#konten">
        Lewati ke konten
      </a>
      <aside className="ar-shell-side">{sidebar}</aside>
      <dialog
        ref={ref}
        className="ar-shell-nav"
        aria-label="Menu"
        onCancel={(e) => {
          e.preventDefault()
          onNavClose?.()
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onNavClose?.()
        }}
      >
        {visible ? sidebar : null}
      </dialog>
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
