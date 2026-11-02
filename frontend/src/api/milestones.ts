import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { MilestoneItem } from '@/types/api'

/** Milestone proyek ini beserta sub-proyeknya, urut tanggal. */
export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: ({ signal }) =>
      apiGet<MilestoneItem[]>(`/api/projects/${projectId}/milestones`, signal),
    enabled: Boolean(projectId),
  })
}

/** Milestone tampil di tab Milestone, di Gantt proyek, dan di Timeline saya, jadi semuanya dimuat ulang. */
function useRefreshMilestones() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['milestones'] }),
      client.invalidateQueries({ queryKey: ['gantt'] }),
      client.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
}

export function useCreateMilestone() {
  const refresh = useRefreshMilestones()
  return useMutation({
    mutationFn: ({ projectId, ...body }: { projectId: string; name: string; date: string }) =>
      apiPost<MilestoneItem>(`/api/projects/${projectId}/milestones`, body),
    onSuccess: refresh,
  })
}

export function useUpdateMilestone() {
  const refresh = useRefreshMilestones()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      name?: string
      date?: string
      isDone?: boolean
      projectId?: string
    }) => apiPatch<MilestoneItem>(`/api/milestones/${id}`, body),
    onSuccess: refresh,
  })
}

export function useDeleteMilestone() {
  const refresh = useRefreshMilestones()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/milestones/${id}`),
    onSuccess: refresh,
  })
}
