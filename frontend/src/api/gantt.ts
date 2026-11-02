import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { GanttResponse, TimelineZoom } from '@/types/api'

/**
 * Data Gantt proyek (rentang, milestone, beban kerja per orang). Kunci diawali ['gantt'] supaya ikut dimuat ulang
 * setiap kali task atau milestone berubah. Daftar task untuk bar datang dari useTasks.
 */
export function useGantt(projectId: string | undefined, zoom: TimelineZoom) {
  return useQuery({
    queryKey: ['gantt', projectId, zoom],
    queryFn: ({ signal }) =>
      apiGet<GanttResponse>(`/api/projects/${projectId}/gantt?zoom=${zoom}`, signal),
    enabled: Boolean(projectId),
    placeholderData: (previous) => previous,
  })
}
