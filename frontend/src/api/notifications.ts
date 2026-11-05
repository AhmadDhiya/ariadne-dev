import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from './client'
import type { NotificationFilter, NotificationPage } from '@/types/api'

const KEY = ['notifications'] as const

/** Angka di lonceng diperbarui berkala (tanpa memuat ulang halaman) dan setiap kali jendela kembali difokuskan. */
const POLL_MS = 60_000

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'unread-count'],
    queryFn: ({ signal }) => apiGet<{ count: number }>('/api/notifications/unread-count', signal),
    enabled,
    refetchInterval: POLL_MS,
    select: (data) => data.count,
  })
}

/** Daftar notifikasi per tab, terbaru dulu, dimuat per halaman ("Muat lebih banyak"). */
export function useNotifications(filter: NotificationFilter, enabled = true, limit = 20) {
  return useInfiniteQuery({
    queryKey: [...KEY, 'list', filter, limit],
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ filter, limit: String(limit) })
      if (pageParam) params.set('before', pageParam)
      return apiGet<NotificationPage>(`/api/notifications?${params.toString()}`, signal)
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
    enabled,
  })
}

function useRefresh() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: KEY })
}

export function useMarkNotificationRead() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/notifications/${id}/read`),
    onSuccess: refresh,
  })
}

export function useMarkAllNotificationsRead() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: () => apiPost('/api/notifications/read-all'),
    onSuccess: refresh,
  })
}
