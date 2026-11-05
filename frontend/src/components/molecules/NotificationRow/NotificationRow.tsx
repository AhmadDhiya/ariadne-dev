import type { MouseEvent } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { cx } from '@/lib/cx'
import './NotificationRow.css'

export interface NotificationRowProps {
  /** Jenis, mis. "Di-mention". */
  label: string
  icon: 'at' | 'plus' | 'move' | 'calendar'
  tone: 'info' | 'primary' | 'muted' | 'warning' | 'danger'
  /** Bagian yang ditebalkan (nama pelaku atau ID task). */
  who: string
  text: string
  detail: string
  time: string
  unread: boolean
  /** Alamat task-nya; klik biasa memanggil onOpen (navigasi di dalam aplikasi), Ctrl/⌘+klik membuka tab baru. */
  href: string
  onOpen: () => void
  /** Keterangan satu baris dengan "…" (panel lonceng) atau boleh beberapa baris (halaman Semua notifikasi). */
  truncate?: boolean
}

/** Satu notifikasi (mockup 10): ikon berwarna, jenis, kalimat, keterangan, jam, dan titik merah bila belum dibaca. */
export function NotificationRow({
  label,
  icon,
  tone,
  who,
  text,
  detail,
  time,
  unread,
  href,
  onOpen,
  truncate = true,
}: NotificationRowProps) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onOpen()
  }

  return (
    <a className={cx('ar-notif', unread && 'is-unread')} href={href} onClick={onClick}>
      <span className={`ar-notif-icon is-${tone}`} aria-hidden>
        <Icon name={icon} size={14} />
      </span>
      <span className="ar-notif-body">
        <span className="ar-notif-kind">{label}</span>
        <span className="ar-notif-text">
          <b>{who}</b> {text}
        </span>
        <span className={cx('ar-notif-detail', truncate && 'is-truncated')}>{detail}</span>
      </span>
      <span className="ar-notif-meta">
        <span className="ar-notif-time">{time}</span>
        {unread ? (
          <span className="ar-notif-dot">
            <VisuallyHidden>Belum dibaca</VisuallyHidden>
          </span>
        ) : null}
      </span>
    </a>
  )
}
