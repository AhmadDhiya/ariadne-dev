import type { MouseEvent } from 'react'
import './Breadcrumb.css'

export interface BreadcrumbItem {
  label: string
  href?: string
  onNavigate?: (e: MouseEvent<HTMLAnchorElement>) => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

/** Jejak lokasi: "Proyek / Sentul". Item terakhir adalah halaman saat ini. */
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="ar-crumbs">
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${i}-${item.label}`}>
              {i > 0 ? (
                <span className="ar-crumb-sep" aria-hidden>
                  /
                </span>
              ) : null}
              {last ? (
                <span className="ar-crumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <a href={item.href} onClick={item.onNavigate}>
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
