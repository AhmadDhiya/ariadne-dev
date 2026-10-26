import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectNode } from '@/types/api'
import { ProjectsTable } from './ProjectsTable'

const PROJECTS: ProjectNode[] = [
  {
    id: 'sen',
    parentId: null,
    rootId: 'sen',
    depth: 0,
    name: 'Sentul',
    code: 'SEN',
    sortOrder: 1,
    taskCount: 0,
  },
  {
    id: 'slm',
    parentId: 'sen',
    rootId: 'sen',
    depth: 1,
    name: 'SLMS',
    code: null,
    sortOrder: 1,
    taskCount: 0,
  },
]

function setup(projects = PROJECTS) {
  const handlers = { onOpen: vi.fn(), onRename: vi.fn(), onArchive: vi.fn() }
  render(<ProjectsTable projects={projects} {...handlers} />)
  return handlers
}

describe('ProjectsTable', () => {
  it('menampilkan nama, kode, dan tingkat tiap proyek', () => {
    setup()
    const root = screen.getByText('Sentul').closest('tr') as HTMLElement
    expect(within(root).getByText('SEN')).toBeInTheDocument()
    expect(within(root).getByText('Proyek')).toBeInTheDocument()
    const child = screen.getByText('SLMS').closest('tr') as HTMLElement
    expect(within(child).getByText('Sub-proyek')).toBeInTheDocument()
  })

  it('tombol Buka, Ubah nama, dan Arsipkan memanggil proyek yang benar', async () => {
    const user = userEvent.setup()
    const { onOpen, onRename, onArchive } = setup()
    await user.click(screen.getByRole('button', { name: 'Buka SLMS' }))
    await user.click(screen.getByRole('button', { name: 'Ubah nama Sentul' }))
    await user.click(screen.getByRole('button', { name: 'Arsipkan Sentul' }))
    expect(onOpen).toHaveBeenCalledWith(PROJECTS[1])
    expect(onRename).toHaveBeenCalledWith(PROJECTS[0])
    expect(onArchive).toHaveBeenCalledWith(PROJECTS[0])
  })

  it('tanpa proyek menampilkan keadaan kosong', () => {
    setup([])
    expect(screen.getByText('Belum ada proyek')).toBeInTheDocument()
  })
})
