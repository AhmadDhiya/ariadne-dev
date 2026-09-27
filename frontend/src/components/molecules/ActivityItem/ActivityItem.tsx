import type { ReactNode } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon, type IconName } from '@/components/atoms/Icon'
import { cx } from '@/lib/cx'
import './ActivityItem.css'

export interface ActivityItemProps {
  kind: 'update' | 'comment' | 'log' | 'internal'
  author: string
  /** Sudah diformat: "09.12", "Kemarin", "25 Sep". */
  time: string
  guest?: boolean
  /** Ikon kecil untuk entri log (default: move). */
  icon?: IconName
  /** Teks biasa; @nama memakai atom Mention. Tidak pernah HTML mentah. */
  children: ReactNode
}

/**
 * Satu entri timeline aktivitas task. `internal` tidak pernah dikirim API ke Tamu;
 * komponen ini tidak menyaringnya, penyaringan dilakukan di server.
 */
export function ActivityItem({ kind, author, time, guest, icon, children }: ActivityItemProps) {
  if (kind === 'log') {
    return (
      <div className="ar-act ar-act-log">
        <span className="ar-act-dot">
          <Icon name={icon ?? 'move'} size={12} />
        </span>
        <span className="ar-act-logtext">
          <b>{author}</b> {children}
        </span>
        <span className="ar-act-time">{time}</span>
      </div>
    )
  }

  return (
    <div className={cx('ar-act', `ar-act-${kind}`)}>
      <Avatar name={author} size={28} guest={guest} />
      <div className="ar-act-body">
        <div className="ar-act-head">
          <b>{author}</b>
          {guest ? <span className="ar-tag-guest">Tamu</span> : null}
          {kind === 'update' ? (
            <span className="ar-badge-update">
              <Icon name="update" size={12} />
              Update
            </span>
          ) : null}
          {kind === 'internal' ? (
            <span className="ar-badge-internal">
              <Icon name="lock" size={12} />
              Internal
            </span>
          ) : null}
          <span className="ar-act-time">{time}</span>
        </div>
        <div className="ar-act-text">{children}</div>
      </div>
    </div>
  )
}
