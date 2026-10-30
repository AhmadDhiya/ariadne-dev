import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client'
import { filtersToQuery, type TaskFilters } from '@/lib/taskFilters'
import type {
  LabelItem,
  PriorityName,
  TaskDetail,
  TaskList,
  TaskRow,
  WorkStatusName,
} from '@/types/api'

export function useTasks(projectId: string | undefined, filters: TaskFilters) {
  const query = filtersToQuery(filters)
  return useQuery({
    queryKey: ['tasks', projectId, query],
    queryFn: ({ signal }) =>
      apiGet<TaskList>(`/api/projects/${projectId}/tasks${query ? `?${query}` : ''}`, signal),
    enabled: Boolean(projectId),
    // Tetap tampilkan daftar lama sambil filter baru dimuat, supaya tabel tidak berkedip kosong
    placeholderData: (previous) => previous,
  })
}

export function useTask(key: string | undefined) {
  return useQuery({
    queryKey: ['task', key],
    queryFn: ({ signal }) => apiGet<TaskDetail>(`/api/tasks/${key}`, signal),
    enabled: Boolean(key),
  })
}

export function useLabels(projectId: string | undefined) {
  return useQuery({
    queryKey: ['labels', projectId],
    queryFn: ({ signal }) => apiGet<LabelItem[]>(`/api/projects/${projectId}/labels`, signal),
    enabled: Boolean(projectId),
  })
}

/** Semua yang bergantung pada task: tabel, detail, angka di sidebar, label, dan "Task aktif" di halaman Tim. */
function useRefreshTasks() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['tasks'] }),
      client.invalidateQueries({ queryKey: ['task'] }),
      client.invalidateQueries({ queryKey: ['labels'] }),
      client.invalidateQueries({ queryKey: ['projects', 'tree'] }),
      client.invalidateQueries({ queryKey: ['teams'] }),
      client.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
}

export interface TaskInput {
  title: string
  description?: string
  priority?: PriorityName
  startDate?: string | null
  dueDate?: string | null
  assigneeIds?: string[]
  labels?: string[]
}

export function useCreateTask() {
  const refresh = useRefreshTasks()
  return useMutation({
    mutationFn: ({ projectId, ...body }: TaskInput & { projectId: string }) =>
      apiPost<TaskRow>(`/api/projects/${projectId}/tasks`, body),
    onSuccess: refresh,
  })
}

export function useCreateSubtask() {
  const refresh = useRefreshTasks()
  return useMutation({
    mutationFn: ({ parentId, ...body }: TaskInput & { parentId: string }) =>
      apiPost<TaskRow>(`/api/tasks/${parentId}/subtasks`, body),
    onSuccess: refresh,
  })
}

export interface TaskChanges {
  title?: string
  description?: string
  priority?: PriorityName
  projectId?: string
  labels?: string[]
}

/** Menyimpan perubahan field task (satu atau beberapa) dalam satu rangkaian; berhenti di kesalahan pertama. */
export function useSaveTask() {
  const refresh = useRefreshTasks()
  return useMutation({
    mutationFn: async (input: {
      id: string
      changes: TaskChanges
      assigneeIds?: string[]
      dates?: { startDate: string | null; dueDate: string | null }
    }) => {
      if (Object.keys(input.changes).length > 0) {
        await apiPatch<TaskRow>(`/api/tasks/${input.id}`, input.changes)
      }
      if (input.assigneeIds) {
        await apiPut<TaskRow>(`/api/tasks/${input.id}/assignees`, { userIds: input.assigneeIds })
      }
      if (input.dates) await apiPut<TaskRow>(`/api/tasks/${input.id}/dates`, input.dates)
    },
    onSuccess: refresh,
  })
}

export interface StatusChange {
  id: string
  status: WorkStatusName
  holdReason?: string
  waitingOnUserId?: string | null
  waitingOnText?: string
}

/**
 * Mengubah status. Tampilan langsung berubah (optimis) lalu dikoreksi dari jawaban server; bila server menolak,
 * nilai lama dikembalikan (pedoman H3).
 */
export function useSetTaskStatus() {
  const client = useQueryClient()
  const refresh = useRefreshTasks()
  return useMutation({
    mutationFn: ({ id, ...body }: StatusChange) => apiPut<TaskRow>(`/api/tasks/${id}/status`, body),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: ['tasks'] })
      const previous = client.getQueriesData<TaskList>({ queryKey: ['tasks'] })
      patchTasks(client, change.id, (task) => ({ ...task, status: change.status }))
      return { previous }
    },
    onError: (_error, _change, context) => {
      for (const [key, data] of context?.previous ?? []) client.setQueryData(key, data)
    },
    onSettled: refresh,
  })
}

function patchTasks(client: QueryClient, id: string, change: (task: TaskRow) => TaskRow) {
  client.setQueriesData<TaskList>({ queryKey: ['tasks'] }, (list) =>
    list
      ? { ...list, tasks: list.tasks.map((task) => (task.id === id ? change(task) : task)) }
      : list,
  )
}

export function useDeleteTask() {
  const refresh = useRefreshTasks()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/tasks/${id}`),
    onSuccess: refresh,
  })
}
