import type { MouseEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { NotificationRow } from '@/components/molecules/NotificationRow'
import { Tabs } from '@/components/molecules/Tabs'
import { cx } from '@/lib/cx'
import { groupByDay, notificationHref, notificationView } from '@/lib/notifications'
import type { NotificationFilter, NotificationItem } from '@/types/api'
import './NotificationPanel.css'

const FILTERS: readonly NotificationFilter[] = ['all', 'unread', 'mentions']

const EMPTY: Record<NotificationFilter, string> = {
  all: 'Belum ada notifikasi.',
  unread: 'Semua notifikasi sudah dibaca.',
  mentions: 'Belum ada yang menyebut Anda.',
}

export interface NotificationPanelProps {
  /** Notifikasi tab aktif, terbaru dulu. */
  items: readonly NotificationItem[]
  /** Hari ini menurut server ("YYYY-MM-DD"), dasar "Hari ini" / "Kemarin". */
  today: string | undefined
  /** Jumlah belum dibaca (semua tab), untuk label "Belum dibaca · 4". */
  unread: number
  filter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  loading?: boolean
  error?: string
  /** Klik satu notifikasi: tandai dibaca lalu buka task-nya. */
  onOpen: (item: NotificationItem) => void
  onMarkAllRead: () => void
  /**
   * popover = panel lonceng (mockup 10): panah, tinggi terbatas, tautan "Lihat semua notifikasi".
   * page = isi halaman Semua notifikasi: tanpa judul (judulnya di halaman), dengan "Muat lebih banyak".
   */
  variant?: 'popover' | 'page'
  seeAllHref?: string
  onSeeAll?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

/** Daftar notifikasi dengan tab Semua / Belum dibaca / Di-mention, dikelompokkan per hari. */
export function NotificationPanel({
  items,
  today,
  unread,
  filter,
  onFilterChange,
  loading,
  error,
  onOpen,
  onMarkAllRead,
  variant = 'popover',
  seeAllHref = '/notifikasi',
  onSeeAll,
  hasMore,
  loadingMore,
  onLoadMore,
}: NotificationPanelProps) {
  const labels: Record<NotificationFilter, string> = {
    all: 'Semua',
    unread: unread > 0 ? `Belum dibaca · ${unread}` : 'Belum dibaca',
    mentions: 'Di-mention',
  }
  const popover = variant === 'popover'

  function seeAll(e: MouseEvent<HTMLAnchorElement>) {
    if (!onSeeAll || e.ctrlKey || e.metaKey || e.shiftKey) return
    e.preventDefault()
    onSeeAll()
  }

  let body
  if (error) body = <p className="ar-notifpanel-note">{error}</p>
  else if (loading || !today) body = <p className="ar-notifpanel-note">Memuat notifikasi…</p>
  else if (items.length === 0) body = <p className="ar-notifpanel-note">{EMPTY[filter]}</p>
  else {
    body = groupByDay(items, today).map((section) => (
      <section key={section.label} aria-label={section.label}>
        <h3 className="ar-notifpanel-day">{section.label}</h3>
        <ul className="ar-notifpanel-list">
          {section.items.map((item) => {
            const view = notificationView(item)
            return (
              <li key={item.id}>
                <NotificationRow
                  {...view}
                  unread={!item.read}
                  href={notificationHref(item)}
                  onOpen={() => onOpen(item)}
                  truncate={popover}
                />
              </li>
            )
          })}
        </ul>
      </section>
    ))
  }

  return (
    <div
      className={cx('ar-notifpanel', `is-${variant}`)}
      role={popover ? 'dialog' : undefined}
      aria-label={popover ? 'Notifikasi' : undefined}
    >
      {popover ? <span className="ar-notifpanel-arrow" aria-hidden /> : null}
      <div className="ar-notifpanel-head">
        {popover ? <h2>Notifikasi</h2> : null}
        <button
          type="button"
          className="ar-notifpanel-action"
          onClick={onMarkAllRead}
          disabled={unread === 0}
        >
          Tandai semua dibaca
        </button>
      </div>
      <div className="ar-notifpanel-tabs">
        <Tabs
          label="Saring notifikasi"
          items={FILTERS.map((f) => labels[f])}
          active={labels[filter]}
          onSelect={(label) => {
            const next = FILTERS.find((f) => labels[f] === label)
            if (next) onFilterChange(next)
          }}
        />
      </div>
      <div className="ar-notifpanel-body" aria-live="polite" aria-busy={loading}>
        {body}
        {!popover && hasMore ? (
          <div className="ar-notifpanel-more">
            <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
            </Button>
          </div>
        ) : null}
      </div>
      {popover ? (
        <a className="ar-notifpanel-all" href={seeAllHref} onClick={seeAll}>
          Lihat semua notifikasi
        </a>
      ) : null}
    </div>
  )
}
