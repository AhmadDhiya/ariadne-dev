import type { ReactNode } from 'react'
import { Logo } from '@/components/molecules/Logo'
import './AuthFormShell.css'

export interface AuthFormShellProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  /** Catatan kecil di bawah form. */
  footnote?: ReactNode
}

/** Kerangka kartu form di halaman masuk, lupa password, dan reset password: logo 40px, judul 28/36, isi form. */
export function AuthFormShell({ title, subtitle, children, footnote }: AuthFormShellProps) {
  return (
    <div className="ar-authshell">
      <Logo size={40} />
      <div>
        <h1 className="ar-authshell-title">{title}</h1>
        {subtitle ? <p className="ar-authshell-sub">{subtitle}</p> : null}
      </div>
      {children}
      {footnote ? <p className="ar-authshell-foot">{footnote}</p> : null}
    </div>
  )
}
