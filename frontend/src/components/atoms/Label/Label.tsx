import type { ReactNode } from 'react'
import './Label.css'

export interface LabelProps {
  children: ReactNode
}

/** Label task (Backend, Infra, UAT). Sengaja abu-abu netral, tidak pernah berwarna. */
export function Label({ children }: LabelProps) {
  return <span className="ar-label">{children}</span>
}
