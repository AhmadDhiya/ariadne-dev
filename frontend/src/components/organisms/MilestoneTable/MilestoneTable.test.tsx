import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MilestoneItem } from '@/types/api'
import { MilestoneTable, type MilestoneTableProps } from './MilestoneTable'

const MILESTONES: MilestoneItem[] = [
  {
    id: 'a',
    projectId: 'p1',
    path: ['Sentul', 'SLMS'],
    name: 'UAT SLMS',
    date: '2026-10-05',
    isDone: false,
  },
  {
    id: 'b',
    projectId: 'p2',
    path: ['Sentul'],
    name: 'Go-Live Sentul',
    date: '2026-10-30',
    isDone: true,
  },
]

function setup(props: Partial<MilestoneTableProps> = {}) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onToggleDone: vi.fn() }
  const user = userEvent.setup()
  render(
    <MilestoneTable
      milestones={MILESTONES}
      canManage
      currentYear={2026}
      empty={<p>Belum ada milestone</p>}
      {...handlers}
      {...props}
    />,
  )
  return { ...handlers, user }
}

describe('MilestoneTable', () => {
  it('menampilkan nama, sub-proyek (tanpa nama root), tanggal, dan status', () => {
    setup({ canManage: false })

    expect(screen.getByText('UAT SLMS')).toBeInTheDocument()
    expect(screen.getByText('SLMS')).toBeInTheDocument()
    expect(screen.getByText('5 Okt')).toBeInTheDocument()
    expect(screen.getByText('30 Okt')).toBeInTheDocument()
    expect(screen.getByText('Belum selesai')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
  })

  it('tanpa hak kelola (anggota, Tamu): tombol dan kotak centang disembunyikan, bukan dinonaktifkan', () => {
    setup({ canManage: false })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('Pengelola: kotak centang mengubah status, Ubah dan Hapus mengirim milestone-nya', async () => {
    const { user, onToggleDone, onEdit, onDelete } = setup()

    await user.click(screen.getByRole('checkbox', { name: 'Tandai UAT SLMS selesai' }))
    await user.click(screen.getByRole('button', { name: 'Ubah Go-Live Sentul' }))
    await user.click(screen.getByRole('button', { name: 'Hapus UAT SLMS' }))

    expect(onToggleDone).toHaveBeenCalledExactlyOnceWith(MILESTONES[0], true)
    expect(onEdit).toHaveBeenCalledExactlyOnceWith(MILESTONES[1])
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(MILESTONES[0])
    expect(screen.getByRole('checkbox', { name: 'Tandai Go-Live Sentul selesai' })).toBeChecked()
  })

  it('kosong menampilkan pesan kosong', () => {
    setup({ milestones: [] })

    expect(screen.getByText('Belum ada milestone')).toBeInTheDocument()
  })
})
