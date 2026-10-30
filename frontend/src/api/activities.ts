import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { ActivityItem, ActivityKindName, ActivityPage } from '@/types/api'

const PAGE_SIZE = 30

/**
 * Timeline aktivitas satu task, terbaru dulu, dimuat bertahap. Kuncinya diawali ['task'] supaya ikut
 * dimuat ulang setiap kali task berubah (status, PIC, tanggal menambah baris log baru).
 */
export function useTaskActivities(taskId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['task', 'activities', taskId],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      apiGet<ActivityPage>(
        `/api/tasks/${taskId}/activities?limit=${PAGE_SIZE}${pageParam === undefined ? '' : `&before=${pageParam}`}`,
        signal,
      ),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    enabled: Boolean(taskId),
  })
}

export interface NewActivity {
  taskId: string
  kind: Exclude<ActivityKindName, 'Log'>
  body: string
  mentionUserIds: string[]
}

/** Update terbaru tampil di kolom "Update terakhir" tabel, jadi tabel ikut dimuat ulang. */
function useRefreshActivities() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['task'] }),
      client.invalidateQueries({ queryKey: ['tasks'] }),
      client.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
}

export function useUpdateActivity() {
  const refresh = useRefreshActivities()
  return useMutation({
    mutationFn: ({
      taskId,
      activityId,
      ...body
    }: {
      taskId: string
      activityId: string
      body: string
      mentionUserIds: string[]
    }) => apiPatch<ActivityItem>(`/api/tasks/${taskId}/activities/${activityId}`, body),
    onSuccess: refresh,
  })
}

export function useDeleteActivity() {
  const refresh = useRefreshActivities()
  return useMutation({
    mutationFn: ({ taskId, activityId }: { taskId: string; activityId: string }) =>
      apiDelete(`/api/tasks/${taskId}/activities/${activityId}`),
    onSuccess: refresh,
  })
}

export function useCreateActivity() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, ...body }: NewActivity) =>
      apiPost<ActivityItem>(`/api/tasks/${taskId}/activities`, body),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['task'] }),
        // Update terbaru tampil di kolom "Update terakhir" tabel
        client.invalidateQueries({ queryKey: ['tasks'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  })
}
