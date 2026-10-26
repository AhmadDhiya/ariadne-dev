import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiGet, apiPatch, apiPost } from './client'
import { ME_KEY } from './queryClient'
import type { Me, ThemeChoice } from '@/types/api'

/**
 * Pengguna yang sedang login. `null` = belum login (bukan kesalahan); `undefined` = masih memuat.
 */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async ({ signal }): Promise<Me | null> => {
      try {
        return await apiGet<Me>('/api/auth/me', signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
  })
}

export interface LoginInput {
  email: string
  password: string
  rememberMe: boolean
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['login'],
    mutationFn: (input: LoginInput) => apiPost<Me>('/api/auth/login', input),
    onSuccess: (me) => {
      // Data akun orang sebelumnya tidak boleh tersisa (mis. login bergantian di komputer yang sama)
      client.clear()
      client.setQueryData(ME_KEY, me)
    },
  })
}

export function useLogout() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost('/api/auth/logout'),
    onSettled: () => {
      client.clear()
      client.setQueryData(ME_KEY, null)
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationKey: ['forgot-password'],
    mutationFn: (email: string) =>
      apiPost<{ message: string }>('/api/auth/forgot-password', { email }),
  })
}

export interface ResetPasswordInput {
  email: string
  token: string
  newPassword: string
}

export function useResetPassword() {
  return useMutation({
    mutationKey: ['reset-password'],
    mutationFn: (input: ResetPasswordInput) => apiPost('/api/auth/reset-password', input),
  })
}

export function useUpdateMe() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { displayName?: string; theme?: ThemeChoice | 'system' }) =>
      apiPatch<Me>('/api/me', input),
    onSuccess: (me) => client.setQueryData(ME_KEY, me),
  })
}
