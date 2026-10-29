import type { ReactNode } from 'react'
import { LabyrinthArt } from '@/components/molecules/LabyrinthArt'
import './AuthLayout.css'

export interface AuthLayoutProps {
  children: ReactNode
}

/** Kerangka halaman masuk (mockup 01): panel navy dengan labirin dan benang di kiri, form di kanan. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="ar-auth">
      <aside className="ar-auth-art" aria-hidden>
        <LabyrinthArt />
        <div className="ar-auth-copy">
          <p className="ar-auth-headline">Benang merah setiap proyek.</p>
          <p className="ar-auth-text">
            Semua task, tenggat, dan beban kerja tim dalam satu tempat, dari proyek pertama sampai
            yang terakhir.
          </p>
        </div>
      </aside>
      <main className="ar-auth-main">{children}</main>
    </div>
  )
}
