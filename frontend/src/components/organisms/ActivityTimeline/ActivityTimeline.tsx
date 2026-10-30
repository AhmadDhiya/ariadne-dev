import { Button } from '@/components/atoms/Button'
import { ActivityItem } from '@/components/molecules/ActivityItem'
import { MentionText } from '@/components/molecules/MentionText'
import { logLine } from '@/lib/activityText'
import { formatActivityTime } from '@/lib/dates'
import type { ActivityItem as ActivityData } from '@/types/api'
import './ActivityTimeline.css'

export interface ActivityTimelineProps {
  items: ActivityData[]
  /** Hari ini menurut server ("YYYY-MM-DD"), dasar tulisan "Kemarin". */
  today: string
  loading?: boolean
  /** Pesan kesalahan bila timeline gagal dimuat. */
  error?: string
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

const KIND = { Update: 'update', Comment: 'comment', Internal: 'internal', Log: 'log' } as const

/**
 * Timeline aktivitas satu task, terbaru dulu: update, komentar, catatan internal, dan log otomatis.
 * Komponen ini hanya menampilkan; catatan internal sudah disaring server dan tidak pernah dikirim ke Tamu.
 */
export function ActivityTimeline({
  items,
  today,
  loading,
  error,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
}: ActivityTimelineProps) {
  if (loading) return <p role="status">Memuat aktivitas…</p>
  if (error) {
    return (
      <div className="ar-timeline-error" role="alert">
        <p>{error}</p>
        {onRetry ? <Button onClick={onRetry}>Coba lagi</Button> : null}
      </div>
    )
  }
  if (items.length === 0) return <p className="ar-timeline-empty">Belum ada aktivitas.</p>

  return (
    <div className="ar-timeline">
      {items.map((item) => {
        const time = formatActivityTime(item.createdAt, today)
        if (item.kind === 'Log') {
          const line = logLine(item)
          return (
            <ActivityItem
              key={item.id}
              kind="log"
              author={item.authorName}
              time={time}
              icon={line.icon}
            >
              {line.text}
            </ActivityItem>
          )
        }
        return (
          <ActivityItem
            key={item.id}
            kind={KIND[item.kind]}
            author={item.authorName}
            time={time}
            guest={item.authorIsGuest}
          >
            <MentionText text={item.body ?? ''} names={item.mentions.map((m) => m.name)} />
          </ActivityItem>
        )
      })}
      {hasMore ? (
        <Button className="ar-timeline-more" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? 'Memuat…' : 'Tampilkan aktivitas lebih lama'}
        </Button>
      ) : null}
    </div>
  )
}
