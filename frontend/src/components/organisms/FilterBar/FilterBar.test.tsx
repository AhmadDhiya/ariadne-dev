import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_FILTERS, type TaskFilters } from '@/lib/taskFilters'
import { FilterBar } from './FilterBar'

const PEOPLE = [
  { id: '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b', name: 'Ahmad' },
  { id: '4a3c9d2f-6e5b-4c7a-8b8f-2d3e4f5a6b7c', name: 'Rama' },
]

function Harness({
  initial = EMPTY_FILTERS,
  onChange = vi.fn(),
}: {
  initial?: TaskFilters
  onChange?: (f: TaskFilters) => void
}) {
  const [filters, setFilters] = useState(initial)
  return (
    <FilterBar
      filters={filters}
      onChange={(next) => {
        setFilters(next)
        onChange(next)
      }}
      people={PEOPLE}
      labels={['UAT', 'API']}
    />
  )
}

describe('FilterBar', () => {
  it('tombol Terlambat, Minggu ini, dan Task saya menyalakan dan mematikan filter, dan bisa dibaca keadaannya', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const overdue = screen.getByRole('button', { name: 'Terlambat' })
    expect(overdue).toHaveAttribute('aria-pressed', 'false')

    await user.click(overdue)

    expect(overdue).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ overdue: true }))
    await user.click(screen.getByRole('button', { name: 'Task saya' }))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ overdue: true, mine: true }),
    )
  })

  it('dropdown status memilih beberapa nilai tanpa menutup, dan chip memperlihatkan jumlahnya', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Status' }))
    const menu = screen.getByRole('listbox', { name: 'Filter status' })
    await user.click(within(menu).getByRole('option', { name: 'Blocked' }))
    await user.click(within(menu).getByRole('option', { name: 'On Hold' }))

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ['Blocked', 'OnHold'] }),
    )
    expect(screen.getByRole('listbox', { name: 'Filter status' })).toBeInTheDocument() // tetap terbuka
    expect(within(menu).getByRole('option', { name: 'Blocked' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('mencentang lagi nilai yang sama mencabutnya', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Prioritas' }))
    const menu = screen.getByRole('listbox', { name: 'Filter prioritas' })

    await user.click(within(menu).getByRole('option', { name: 'Critical' }))
    await user.click(within(menu).getByRole('option', { name: 'Critical' }))

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ priority: [] }))
  })

  it('filter PIC memakai id orangnya dan label tidak membedakan huruf besar/kecil', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial={{ ...EMPTY_FILTERS, label: ['uat'] }} />)

    await user.click(screen.getByRole('button', { name: /PIC/ }))
    await user.click(
      within(screen.getByRole('listbox', { name: 'Filter PIC' })).getByRole('option', {
        name: 'Rama',
      }),
    )
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pic: [PEOPLE[1]?.id] }))

    await user.click(screen.getByRole('button', { name: /Label/ }))
    const labels = screen.getByRole('listbox', { name: 'Filter label' })
    expect(within(labels).getByRole('option', { name: 'UAT' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(within(labels).getByRole('option', { name: 'UAT' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ label: [] }))
  })

  it('pencarian mengisi filter q', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.type(screen.getByRole('searchbox', { name: 'Cari di proyek ini' }), 'absensi')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'absensi' }))
  })

  it('Esc menutup dropdown', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Status' }))

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
