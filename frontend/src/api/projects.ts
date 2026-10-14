import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { ProjectDetail, ProjectMemberItem, ProjectNode, ProjectRole } from '@/types/api'

export function useProjectTree(enabled = true) {
  return useQuery({
    queryKey: ['projects', 'tree'],
    queryFn: ({ signal }) => apiGet<ProjectNode[]>('/api/projects/tree', signal),
    enabled,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: ({ signal }) => apiGet<ProjectDetail>(`/api/projects/${id}`, signal),
    enabled: Boolean(id),
  })
}

export function useProjectMembers(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id, 'members'],
    queryFn: ({ signal }) => apiGet<ProjectMemberItem[]>(`/api/projects/${id}/members`, signal),
    enabled: Boolean(id),
  })
}

function useRefreshProjects() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['projects'] })
}

export function useCreateProject() {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (input: { name: string; code: string }) =>
      apiPost<ProjectNode>('/api/projects', input),
    onSuccess: refresh,
  })
}

export function useCreateSubProject(parentId: string) {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (name: string) =>
      apiPost<ProjectNode>(`/api/projects/${parentId}/children`, { name }),
    onSuccess: refresh,
  })
}

export function useAddProjectMember(projectId: string) {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (input: { userId: string; role: ProjectRole }) =>
      apiPost(`/api/projects/${projectId}/members`, input),
    onSuccess: refresh,
  })
}

export function useChangeProjectMemberRole(projectId: string) {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (input: { userId: string; role: ProjectRole }) =>
      apiPatch(`/api/projects/${projectId}/members/${input.userId}`, { role: input.role }),
    onSuccess: refresh,
  })
}

export function useRemoveProjectMember(projectId: string) {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (userId: string) => apiDelete(`/api/projects/${projectId}/members/${userId}`),
    onSuccess: refresh,
  })
}
