import type { MouseEvent } from 'react'
import { Icon, type IconName } from '@/components/atoms/Icon'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { cx } from '@/lib/cx'
import './NavItem.css'

export interface NavItemProps {
  label: string
  icon?: IconName
  /** 0 proyek, 1 sub-proyek, 2 sub-sub-proyek. */
  depth?: 0 | 1 | 2
  expandable?: boolean
  expanded?: boolean
  active?: boolean
  /** Jumlah task terbuka. */
  count?: number
  href?: string
  /** Dipanggil saat tautan diklik (mis. navigasi React Router tanpa reload). */
  onNavigate?: (e: MouseEvent<HTMLAnchorElement>) => void
  onToggle?: () => void
}

/**
 * Satu baris sidebar atau simpul pohon proyek. Tampilan sama dengan design system, tetapi
 * dibangun dari tautan + tombol buka/tutup supaya bisa dipakai dengan keyboard (pedoman H1).
 */
export function NavItem({
  label,
  icon,
  depth = 0,
  expandable,
  expanded,
  active,
  count,
  href,
  onNavigate,
  onToggle,
}: NavItemProps) {
  const content = (
    <>
      {icon ? <Icon name={icon} size={16} /> : null}
      <span className="ar-nav-label">{label}</span>
      {count != null ? (
        <span className="ar-nav-count">
          {count}
          <VisuallyHidden> task terbuka</VisuallyHidden>
        </span>
      ) : null}
    </>
  )

  return (
    <div
      className={cx('ar-nav', active && 'is-active')}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      {expandable ? (
        <button
          type="button"
          className={cx('ar-nav-caret', expanded && 'is-open')}
          aria-expanded={Boolean(expanded)}
          aria-label={`${expanded ? 'Tutup' : 'Buka'} ${label}`}
          onClick={onToggle}
        >
          <Icon name="chevron-right" size={14} />
        </button>
      ) : depth ? (
        <span className="ar-nav-caret" />
      ) : null}
      {href ? (
        <a
          className="ar-nav-link"
          href={href}
          aria-current={active ? 'page' : undefined}
          onClick={onNavigate}
        >
          {content}
        </a>
      ) : (
        <span className="ar-nav-link">{content}</span>
      )}
    </div>
  )
}
