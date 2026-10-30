import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { DashboardCard, DashboardResponse, TimelineResponse, TimelineZoom } from '@/types/api'

/**
 * Dashboard pribadi. Kuncinya diawali ['dashboard'] supaya ikut dimuat ulang setiap kali task atau aktivitas berubah
 * (lihat useRefreshTasks). Daftar lama tetap tampil selagi data baru dimuat, supaya tidak berkedip.
 */
export function useDashboard(card: DashboardCard | null) {
  return useQuery({
    queryKey: ['dashboard', 'summary', card],
    queryFn: ({ signal }) =>
      apiGet<DashboardResponse>(`/api/dashboard${card ? `?card=${card}` : ''}`, signal),
    placeholderData: (previous) => previous,
  })
}

export function useTimeline(zoom: TimelineZoom) {
  return useQuery({
    queryKey: ['dashboard', 'timeline', zoom],
    queryFn: ({ signal }) =>
      apiGet<TimelineResponse>(`/api/dashboard/timeline?zoom=${zoom}`, signal),
    placeholderData: (previous) => previous,
  })
}
