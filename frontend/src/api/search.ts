import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { SearchResults } from '@/types/api'

/** Pencarian global di topbar. Kata kosong tidak mengirim permintaan. */
export function useSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) =>
      apiGet<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`, signal),
    enabled: q.length > 0,
    staleTime: 15_000,
  })
}
