import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from './client'
import type { UserLookupItem, UserSummary } from '@/types/api'

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => apiGet<UserSummary[]>('/api/users', signal),
    enabled,
  })
}

export function useCreateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; displayName: string; isAdmin: boolean }) =>
      apiPost<UserSummary>('/api/users', input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: string
      displayName?: string
      isAdmin?: boolean
      isActive?: boolean
    }) => apiPatch(`/api/users/${id}`, changes),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

/** Pencarian orang untuk ditambahkan; `exclude` menyembunyikan yang sudah menjadi anggota. */
export function useUserLookup(
  query: string,
  exclude: { teamId?: string; projectId?: string },
  enabled = true,
) {
  const term = query.trim()
  return useQuery({
    queryKey: ['users', 'lookup', term, exclude.teamId ?? null, exclude.projectId ?? null],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ q: term })
      if (exclude.teamId) params.set('teamId', exclude.teamId)
      if (exclude.projectId) params.set('projectId', exclude.projectId)
      return apiGet<UserLookupItem[]>(`/api/users/lookup?${params.toString()}`, signal)
    },
    enabled: enabled && term.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
}
