import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectPickDialog } from './ProjectPickDialog'

const PROJECTS = [
  { id: 'p1', name: 'Migrasi Data Center' },
  { id: 'p2', name: 'Sentul' },
]

describe('ProjectPickDialog', () => {
  it('pilihan awal proyek pertama; Lanjut mengirim proyek yang dipilih', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<ProjectPickDialog open onClose={vi.fn()} projects={PROJECTS} onPick={onPick} />)
    const dialog = screen.getByRole('dialog', { name: 'Tambah task di proyek mana?' })

    await user.selectOptions(within(dialog).getByLabelText(/^Proyek/), 'Sentul')
    await user.click(within(dialog).getByRole('button', { name: 'Lanjut' }))

    expect(onPick).toHaveBeenCalledExactlyOnceWith('p2')
  })

  it('tanpa mengubah pilihan, proyek pertama yang dipakai', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    render(<ProjectPickDialog open onClose={vi.fn()} projects={PROJECTS} onPick={onPick} />)

    await user.click(screen.getByRole('button', { name: 'Lanjut' }))

    expect(onPick).toHaveBeenCalledExactlyOnceWith('p1')
  })

  it('tanpa proyek yang boleh dipakai, menjelaskan alasannya dan Lanjut mati', () => {
    render(<ProjectPickDialog open onClose={vi.fn()} projects={[]} onPick={vi.fn()} />)

    expect(screen.getByText(/belum menjadi Pengelola atau Anggota/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lanjut' })).toBeDisabled()
  })
})
