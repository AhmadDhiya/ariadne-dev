import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AddMemberBar, type Candidate } from './AddMemberBar'

const PEOPLE: Candidate[] = [
  { id: '1', name: 'Khalil', hint: 'Tim Sentul' },
  { id: '2', name: 'Khairul', hint: null },
]

function Harness({
  people = PEOPLE,
  onSubmit = vi.fn(),
}: {
  people?: Candidate[]
  onSubmit?: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [role, setRole] = useState<'Anggota' | 'Supervisor'>('Anggota')
  return (
    <AddMemberBar
      label="Tambah anggota"
      query={query}
      onQueryChange={setQuery}
      candidates={people}
      selected={selected}
      onSelect={setSelected}
      roles={[
        { value: 'Anggota', label: 'Anggota' },
        { value: 'Supervisor', label: 'Supervisor' },
      ]}
      role={role}
      onRoleChange={setRole}
      roleLabel="Peran"
      onSubmit={onSubmit}
    />
  )
}

describe('AddMemberBar', () => {
  it('daftar hanya muncul setelah mengetik, dan combobox memberi tahu status bukanya', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: 'Tambah anggota' })
    expect(box).toHaveAttribute('aria-expanded', 'false')
    await user.type(box, 'Kh')
    expect(box).toHaveAttribute('aria-expanded', 'true')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2)
  })

  it('panah bawah + Enter memilih calon kedua; Enter lagi mengirim', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)
    const box = screen.getByRole('combobox', { name: 'Tambah anggota' })
    await user.type(box, 'Kh')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(box).toHaveValue('Khairul')
    expect(box).toHaveAttribute('aria-expanded', 'false')
    expect(onSubmit).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('tanpa pilihan, Enter tidak mengirim apa pun', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness people={[]} onSubmit={onSubmit} />)
    await user.type(screen.getByRole('combobox', { name: 'Tambah anggota' }), 'zzz{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Tidak ada orang yang cocok.')
  })

  it('Esc menutup daftar tanpa menghapus ketikan', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: 'Tambah anggota' })
    await user.type(box, 'Kh{Escape}')
    expect(box).toHaveAttribute('aria-expanded', 'false')
    expect(box).toHaveValue('Kh')
  })

  it('mengetik lagi setelah memilih membatalkan pilihan sebelumnya', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: 'Tambah anggota' })
    await user.type(box, 'Kh{Enter}')
    expect(box).toHaveValue('Khalil')
    await user.type(box, 'x')
    expect(box).toHaveAttribute('aria-expanded', 'true')
  })
})
