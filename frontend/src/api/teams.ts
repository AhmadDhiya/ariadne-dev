import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import { ME_KEY } from './queryClient'
import type { TeamDetail, TeamRole, TeamSummary } from '@/types/api'

export function useTeams(enabled = true) {
  return useQuery({
    queryKey: ['teams'],
    queryFn: ({ signal }) => apiGet<TeamSummary[]>('/api/teams', signal),
    enabled,
  })
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: ({ signal }) => apiGet<TeamDetail>(`/api/teams/${id}`, signal),
    enabled: Boolean(id),
  })
}

/** Perubahan tim memengaruhi daftar tim, detailnya, dan menu pengguna (peran supervisor), jadi semuanya disegarkan. */
function useRefreshTeams() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['teams'] }),
      client.invalidateQueries({ queryKey: ME_KEY }),
      client.invalidateQueries({ queryKey: ['users'] }),
    ])
}

export function useCreateTeam() {
  const refresh = useRefreshTeams()
  return useMutation({
    mutationFn: (name: string) => apiPost<TeamSummary>('/api/teams', { name }),
    onSuccess: refresh,
  })
}

export function useRenameTeam(id: string) {
  const refresh = useRefreshTeams()
  return useMutation({
    mutationFn: (name: string) => apiPatch(`/api/teams/${id}`, { name }),
    onSuccess: refresh,
  })
}

export function useAddTeamMember(teamId: string) {
  const refresh = useRefreshTeams()
  return useMutation({
    mutationFn: (input: { userId: string; role: TeamRole }) =>
      apiPost(`/api/teams/${teamId}/members`, input),
    onSuccess: refresh,
  })
}

export function useChangeTeamMemberRole(teamId: string) {
  const refresh = useRefreshTeams()
  return useMutation({
    mutationFn: (input: { userId: string; role: TeamRole }) =>
      apiPatch(`/api/teams/${teamId}/members/${input.userId}`, { role: input.role }),
    onSuccess: refresh,
  })
}

export function useRemoveTeamMember(teamId: string) {
  const refresh = useRefreshTeams()
  return useMutation({
    mutationFn: (userId: string) => apiDelete(`/api/teams/${teamId}/members/${userId}`),
    onSuccess: refresh,
  })
}
