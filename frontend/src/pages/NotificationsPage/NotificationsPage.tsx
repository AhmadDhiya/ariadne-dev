import { useState } from 'react'
import { useNavigate } from 'react-router'
import { messageOf } from '@/api/errors'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/notifications'
import { PageHeader } from '@/components/molecules/PageHeader'
import { NotificationPanel } from '@/components/organisms/NotificationPanel'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { notificationHref } from '@/lib/notifications'
import type { NotificationFilter } from '@/types/api'
import './NotificationsPage.css'

/** "Lihat semua notifikasi" (tanpa mockup; isi sama dengan panel lonceng, dimuat per 30). */
export function NotificationsPage() {
  useDocumentTitle('Notifikasi')
  const navigate = useNavigate()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const list = useNotifications(filter, true, 30)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const first = list.data?.pages[0]

  return (
    <div className="ar-notifpage">
      <PageHeader
        title="Notifikasi"
        description="Mention, penugasan, task yang dipindahkan ke Anda, dan pengingat tenggat harian pukul 07.00."
      />
      <NotificationPanel
        variant="page"
        items={list.data?.pages.flatMap((p) => p.items) ?? []}
        today={first?.today}
        unread={first?.unread ?? 0}
        filter={filter}
        onFilterChange={setFilter}
        loading={list.isPending}
        error={list.isError ? messageOf(list.error) : undefined}
        onOpen={(item) => {
          if (!item.read) markRead.mutate(item.id)
          void navigate(notificationHref(item))
        }}
        onMarkAllRead={() => markAll.mutate()}
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onLoadMore={() => void list.fetchNextPage()}
      />
    </div>
  )
}
