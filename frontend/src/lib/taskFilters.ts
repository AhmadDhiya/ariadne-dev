import { PRIORITY_NAMES, WORK_STATUS_NAMES } from '@/lib/status'
import type { PriorityName, WorkStatusName } from '@/types/api'

/**
 * Filter tabel task. Disimpan di alamat halaman (?status=Blocked&overdue=1) supaya bisa dibagikan dan
 * bertahan saat halaman dimuat ulang. Nilai yang tidak dikenal dibuang, bukan dikirim ke server.
 */
export interface TaskFilters {
  pic: string[]
  status: WorkStatusName[]
  priority: PriorityName[]
  label: string[]
  overdue: boolean
  thisWeek: boolean
  mine: boolean
  q: string
}

export const EMPTY_FILTERS: TaskFilters = {
  pic: [],
  status: [],
  priority: [],
  label: [],
  overdue: false,
  thisWeek: false,
  mine: false,
  q: '',
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const list = (raw: string | null) =>
  (raw ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

export function filtersFromParams(params: URLSearchParams): TaskFilters {
  return {
    pic: list(params.get('pic')).filter((id) => GUID.test(id)),
    status: list(params.get('status')).filter((v): v is WorkStatusName =>
      (WORK_STATUS_NAMES as string[]).includes(v),
    ),
    priority: list(params.get('priority')).filter((v): v is PriorityName =>
      (PRIORITY_NAMES as string[]).includes(v),
    ),
    label: list(params.get('label')),
    overdue: params.get('overdue') === '1',
    thisWeek: params.get('thisWeek') === '1',
    mine: params.get('mine') === '1',
    q: (params.get('q') ?? '').slice(0, 100),
  }
}

/** Parameter alamat halaman; filter kosong tidak ditulis. */
export function filtersToParams(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.pic.length) params.set('pic', filters.pic.join(','))
  if (filters.status.length) params.set('status', filters.status.join(','))
  if (filters.priority.length) params.set('priority', filters.priority.join(','))
  if (filters.label.length) params.set('label', filters.label.join(','))
  if (filters.overdue) params.set('overdue', '1')
  if (filters.thisWeek) params.set('thisWeek', '1')
  if (filters.mine) params.set('mine', '1')
  if (filters.q.trim()) params.set('q', filters.q.trim())
  return params
}

/** Query string untuk API (true/false, bukan 1). Urutannya tetap, supaya cocok sebagai kunci cache. */
export function filtersToQuery(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.pic.length) params.set('pic', filters.pic.join(','))
  if (filters.status.length) params.set('status', filters.status.join(','))
  if (filters.priority.length) params.set('priority', filters.priority.join(','))
  if (filters.label.length) params.set('label', filters.label.join(','))
  if (filters.overdue) params.set('overdue', 'true')
  if (filters.thisWeek) params.set('thisWeek', 'true')
  if (filters.mine) params.set('mine', 'true')
  if (filters.q.trim()) params.set('q', filters.q.trim())
  return params.toString()
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return filtersToParams(filters).size > 0
}
