import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut } from './client'
import type {
  MoveCandidates,
  PriorityName,
  TaskRow,
  TeamTimelineResponse,
  TimelineZoom,
  WorkStatusName,
} from '@/types/api'

export interface TeamTimelineFilters {
  teamId?: string
  zoom: TimelineZoom
  /** Id proyek root. */
  project?: string
  status: readonly WorkStatusName[]
  priority: readonly PriorityName[]
  overdueOnly: boolean
}

function toQuery(filters: TeamTimelineFilters): string {
  const params = new URLSearchParams({ zoom: filters.zoom })
  if (filters.teamId) params.set('teamId', filters.teamId)
  if (filters.project) params.set('project', filters.project)
  if (filters.status.length > 0) params.set('status', filters.status.join(','))
  if (filters.priority.length > 0) params.set('priority', filters.priority.join(','))
  if (filters.overdueOnly) params.set('overdueOnly', 'true')
  return params.toString()
}

/** Timeline Tim. Kunci diawali ['team-timeline'] supaya dimuat ulang setelah task dipindah atau tanggalnya diubah. */
export function useTeamTimeline(filters: TeamTimelineFilters) {
  return useQuery({
    queryKey: ['team-timeline', filters],
    queryFn: ({ signal }) =>
      apiGet<TeamTimelineResponse>(`/api/team-timeline?${toQuery(filters)}`, signal),
    placeholderData: (previous) => previous,
  })
}

/** Calon penerima "Pindahkan ke…" beserta beban hariannya; hanya dimuat saat dialog dibuka. */
export function useMoveCandidates(taskId: string | undefined) {
  return useQuery({
    queryKey: ['move-candidates', taskId],
    queryFn: ({ signal }) => apiGet<MoveCandidates>(`/api/tasks/${taskId}/move-candidates`, signal),
    enabled: Boolean(taskId),
    gcTime: 0,
  })
}

/** Memuat ulang semua yang bergantung pada task setelah perubahan oleh supervisor. */
function useRefreshAfterChange() {
  const client = useQueryClient()
  return () =>
    Promise.all(
      ['team-timeline', 'move-candidates', 'tasks', 'task', 'dashboard', 'gantt'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    )
}

export interface MoveTaskInput {
  taskId: string
  fromUserId: string
  toUserId: string
  notify: boolean
}

export function useMoveTask() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: ({ taskId, ...body }: MoveTaskInput) =>
      apiPost<TaskRow>(`/api/tasks/${taskId}/move`, body),
    onSuccess: refresh,
  })
}

export interface ChangeDatesInput {
  taskId: string
  startDate: string | null
  dueDate: string | null
}

export function useChangeTaskDates() {
  const refresh = useRefreshAfterChange()
  return useMutation({
    mutationFn: ({ taskId, ...body }: ChangeDatesInput) =>
      apiPut<TaskRow>(`/api/tasks/${taskId}/dates`, body),
    onSuccess: refresh,
  })
}
