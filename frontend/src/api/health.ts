import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'

export interface Health {
  status: 'ok' | 'degraded'
  database: 'ok' | 'unreachable'
}

/** Status API dan database (GET /api/health). */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiGet<Health>('/api/health', signal),
    retry: false,
  })
}
