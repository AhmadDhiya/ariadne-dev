import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TeamDetail } from '@/types/api'
import { TeamMembersPanel } from './TeamMembersPanel'

const TEAM: TeamDetail = {
  id: 't',
  name: 'Tim Sentul',
  canManage: true,
  supervisors: ['Ahmad'],
  projects: ['Sentul', 'Migrasi Data Center'],
  members: [
    {
      userId: '1',
      displayName: 'Ahmad',
      email: 'ahmad@perusahaan.co.id',
      role: 'Supervisor',
      otherTeams: ['Tim QA'],
      activeTasks: 0,
    },
    {
      userId: '2',
      displayName: 'Rama',
      email: 'rama@perusahaan.co.id',
      role: 'Anggota',
      otherTeams: [],
      activeTasks: 0,
    },
  ],
}

describe('TeamMembersPanel', () => {
  it('judul, ringkasan proyek, dan tabel anggota', () => {
    render(
      <TeamMembersPanel
        team={TEAM}
        onRename={() => {}}
        onChangeRole={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Tim Sentul' })).toBeInTheDocument()
    expect(screen.getByText(/Proyek: Sentul, Migrasi Data Center/)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Anggota Tim Sentul' })).toBeInTheDocument()
    expect(screen.getByText('Tim QA')).toBeInTheDocument()
  })

  it('yang boleh mengelola: ubah peran, keluarkan, dan ganti nama', async () => {
    const user = userEvent.setup()
    const onChangeRole = vi.fn()
    const onRemove = vi.fn()
    const onRename = vi.fn()
    render(
      <TeamMembersPanel
        team={TEAM}
        onRename={onRename}
        onChangeRole={onChangeRole}
        onRemove={onRemove}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox', { name: 'Peran Rama' }), 'Supervisor')
    expect(onChangeRole).toHaveBeenCalledWith('2', 'Supervisor')
    await user.click(screen.getByRole('button', { name: 'Keluarkan Rama dari Tim Sentul' }))
    expect(onRemove).toHaveBeenCalledWith('2')
    await user.click(screen.getByRole('button', { name: 'Ubah tim' }))
    expect(onRename).toHaveBeenCalled()
  })

  it('tanpa hak kelola semua kontrol ubah tidak ada', () => {
    render(
      <TeamMembersPanel
        team={{ ...TEAM, canManage: false }}
        onRename={() => {}}
        onChangeRole={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
