import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { DashboardCard, DashboardResponse, TimelineResponse, TimelineZoom } from '@/types/api'

/**
 * Dashboard pribadi. Kuncinya diawali ['dashboard'] supaya ikut dimuat ulang setiap kali task atau aktivitas berubah
 * (lihat useRefreshTasks). Daftar lama tetap tampil selagi data baru dimuat, supaya tidak berkedip.
 */
export function useDashboard(card: DashboardCard | null, userId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'summary', card, userId ?? null],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (card) params.set('card', card)
      if (userId) params.set('userId', userId)
      const query = params.toString()
      return apiGet<DashboardResponse>(`/api/dashboard${query ? `?${query}` : ''}`, signal)
    },
    placeholderData: (previous) => previous,
  })
}

export function useTimeline(zoom: TimelineZoom, userId?: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['dashboard', 'timeline', zoom, userId ?? null],
    queryFn: ({ signal }) =>
      apiGet<TimelineResponse>(
        `/api/dashboard/timeline?zoom=${zoom}${userId ? `&userId=${userId}` : ''}`,
        signal,
      ),
    placeholderData: (previous) => previous,
  })
}
