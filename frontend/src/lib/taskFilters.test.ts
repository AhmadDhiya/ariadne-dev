import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  hasActiveFilters,
} from './taskFilters'

const ID = '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b'

describe('taskFilters', () => {
  it('membaca filter dari alamat halaman dan menuliskannya kembali sama persis', () => {
    const params = new URLSearchParams(
      `pic=${ID}&status=Blocked,OnHold&priority=Critical&label=UAT,API&overdue=1&thisWeek=1&mine=1&q=absensi`,
    )

    const filters = filtersFromParams(params)

    expect(filters).toEqual({
      pic: [ID],
      status: ['Blocked', 'OnHold'],
      priority: ['Critical'],
      label: ['UAT', 'API'],
      overdue: true,
      thisWeek: true,
      mine: true,
      q: 'absensi',
    })
    expect(filtersToParams(filters).toString()).toBe(params.toString())
  })

  it('membuang nilai yang tidak dikenal alih-alih mengirimnya ke server', () => {
    const filters = filtersFromParams(
      new URLSearchParams('pic=bukan-guid&status=Selesai,Done,0&priority=urgent&overdue=maybe'),
    )

    expect(filters).toEqual({ ...EMPTY_FILTERS, status: ['Done'] })
  })

  it('tanpa filter semuanya kosong', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(EMPTY_FILTERS)
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(filtersToQuery(EMPTY_FILTERS)).toBe('')
  })

  it('kata pencarian hanya spasi tidak dianggap filter, dan dibatasi 100 karakter', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: '   ' })).toBe(false)
    expect(filtersFromParams(new URLSearchParams({ q: 'x'.repeat(150) })).q).toHaveLength(100)
  })

  it('query untuk API memakai true, dan kuncinya selalu berurutan sama', () => {
    const a = filtersToQuery({ ...EMPTY_FILTERS, overdue: true, status: ['Blocked'] })
    const b = filtersToQuery({ ...EMPTY_FILTERS, status: ['Blocked'], overdue: true })

    expect(a).toBe('status=Blocked&overdue=true')
    expect(b).toBe(a)
  })
})
