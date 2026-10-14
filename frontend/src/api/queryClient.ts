import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

export const ME_KEY = ['me'] as const

/**
 * Sesi habis di tengah pemakaian (401 dari endpoint mana pun selain login): tandai "belum login" sehingga
 * RequireAuth mengarahkan ke halaman masuk. Login dan lupa password sendiri tidak ikut, karena 401 di sana
 * artinya "email atau password salah".
 */
function onSessionLost(client: QueryClient) {
  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      client.setQueryData(ME_KEY, null)
    }
  }
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryKey[0] !== 'me') onSessionLost(client)(error)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.mutationKey?.[0] !== 'login') onSessionLost(client)(error)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Kesalahan izin (401/403/404) tidak akan berubah dengan mengulang
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
        refetchOnWindowFocus: true,
      },
    },
  })
  return client
}

export const queryClient = createQueryClient()
