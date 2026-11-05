import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import { ME_KEY } from './queryClient'
import type {
  AcceptInvitationResponse,
  InvitationItem,
  InvitationPreview,
  InviteResult,
  ProjectRole,
} from '@/types/api'

/** Undangan yang menunggu; kuncinya di bawah ['projects'] supaya ikut dimuat ulang bersama daftar anggota. */
export function useInvitations(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['projects', projectId, 'invitations'],
    queryFn: ({ signal }) =>
      apiGet<InvitationItem[]>(`/api/projects/${projectId}/invitations`, signal),
    enabled: Boolean(projectId) && enabled,
  })
}

function useRefreshProjects() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['projects'] })
}

export function useInvite(projectId: string) {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (input: { emails: string[]; role: ProjectRole; message?: string }) =>
      apiPost<InviteResult[]>(`/api/projects/${projectId}/invitations`, input),
    onSuccess: refresh,
  })
}

export function useChangeInvitationRole() {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (input: { id: string; role: ProjectRole }) =>
      apiPatch(`/api/invitations/${input.id}`, { role: input.role }),
    onSuccess: refresh,
  })
}

export function useCancelInvitation() {
  const refresh = useRefreshProjects()
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/invitations/${id}`),
    onSuccess: refresh,
  })
}

/** Isi undangan dari token (tanpa login). Token dikirim di badan permintaan, bukan di alamat. */
export function useInvitationPreview(token: string | null) {
  return useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => apiPost<InvitationPreview>('/api/invitations/preview', { token }),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  })
}

export function useAcceptInvitation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { token: string; displayName: string; password: string }) =>
      apiPost<AcceptInvitationResponse>('/api/invitations/accept', input),
    onSuccess: (result) => {
      if (result.signedIn) {
        // Data akun sebelumnya (bila ada) tidak boleh tersisa; data akun baru dimuat ulang
        client.clear()
        void client.invalidateQueries({ queryKey: ME_KEY })
      }
    },
  })
}
