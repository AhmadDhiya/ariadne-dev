import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectNode } from '@/types/api'
import { Sidebar } from './Sidebar'

const node = (
  id: string,
  name: string,
  depth: number,
  parentId: string | null,
  sortOrder = 1,
): ProjectNode => ({
  id,
  name,
  depth,
  parentId,
  rootId: parentId ? 'sen' : id,
  code: depth === 0 ? name.slice(0, 3).toUpperCase() : null,
  sortOrder,
  taskCount: 0,
})
const PROJECTS = [
  node('sen', 'Sentul', 0, null),
  node('dis', 'Dispatch', 1, 'sen', 1),
  node('slm', 'SLMS', 1, 'sen', 2),
  node('tem', 'Temuan UAT', 2, 'slm'),
  node('mdc', 'Migrasi Data Center', 0, null, 2),
]

function setup(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const onNavigate = vi.fn()
  render(
    <Sidebar
      projects={PROJECTS}
      activeKey="dashboard"
      activeProjectId={null}
      showTimeline
      showTeams
      showSettings
      onNavigate={onNavigate}
      {...props}
    />,
  )
  return { onNavigate }
}

describe('Sidebar', () => {
  it('menu yang bukan hak disembunyikan, bukan dinonaktifkan', () => {
    setup({ showTimeline: false, showTeams: false, showSettings: false })
    for (const name of ['Timeline Tim', 'Tim', 'Pengaturan']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('tanpa proyek aktif, proyek pertama terbuka dan cabang lain tertutup', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Dispatch' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Temuan UAT' })).not.toBeInTheDocument()
  })

  it('proyek aktif membuka induk-induknya dan menandai dirinya dengan aria-current', () => {
    setup({ activeKey: null, activeProjectId: 'tem' })
    expect(screen.getByRole('link', { name: 'Temuan UAT' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'SLMS' })).not.toHaveAttribute('aria-current')
  })

  it('tombol panah membuka dan menutup cabang', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Buka SLMS' }))
    expect(screen.getByRole('link', { name: 'Temuan UAT' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tutup Sentul' }))
    expect(screen.queryByRole('link', { name: 'Dispatch' })).not.toBeInTheDocument()
  })

  it('klik biasa memakai router; Ctrl-klik dibiarkan membuka tab baru', async () => {
    const user = userEvent.setup()
    const { onNavigate } = setup()
    await user.click(screen.getByRole('link', { name: 'Dispatch' }))
    expect(onNavigate).toHaveBeenCalledWith('/proyek/dis')
    onNavigate.mockClear()
    await user.keyboard('{Control>}')
    await user.click(screen.getByRole('link', { name: 'Dispatch' }))
    await user.keyboard('{/Control}')
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
