import type { ReactNode } from 'react'
import './VisuallyHidden.css'

export interface VisuallyHiddenProps {
  children: ReactNode
}

/** Teks yang hanya dibaca pembaca layar, tidak terlihat di layar. */
export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return <span className="ar-sr-only">{children}</span>
}
