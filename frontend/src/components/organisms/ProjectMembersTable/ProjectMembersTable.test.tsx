import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { InvitationItem, ProjectMemberItem } from '@/types/api'
import { ProjectMembersTable } from './ProjectMembersTable'

const MEMBERS: ProjectMemberItem[] = [
  {
    userId: '1',
    displayName: 'Ahmad',
    email: 'ahmad@perusahaan.co.id',
    role: 'Pengelola',
    isGuest: false,
    status: 'Aktif',
    addedAt: '2026-06-02T02:00:00Z',
  },
  {
    userId: '2',
    displayName: 'Pak Budi',
    email: null,
    role: 'Tamu',
    isGuest: true,
    status: 'Aktif',
    addedAt: '2026-08-03T02:00:00Z',
  },
]

const SARI: InvitationItem = {
  id: 'inv-1',
  email: 'sari@klien.example',
  role: 'Tamu',
  invitedBy: 'Ahmad',
  createdAt: '2026-09-26T02:00:00Z',
  expiresAt: '2026-10-03T02:00:00Z',
  expired: false,
}
const INVITES: InvitationItem[] = [SARI]

describe('ProjectMembersTable', () => {
  it('undangan tampil sebagai "Menunggu diterima" dengan peran yang bisa diubah dan tombol Batalkan', async () => {
    const user = userEvent.setup()
    const onChangeInvitationRole = vi.fn()
    const onCancelInvitation = vi.fn()
    render(
      <ProjectMembersTable
        projectName="Sentul"
        members={MEMBERS}
        invitations={INVITES}
        canManage
        onChangeRole={() => {}}
        onRemove={() => {}}
        onChangeInvitationRole={onChangeInvitationRole}
        onCancelInvitation={onCancelInvitation}
      />,
    )

    expect(screen.getByText('Sari')).toBeInTheDocument()
    expect(screen.getByText('Menunggu diterima')).toBeInTheDocument()
    expect(screen.getByText('26 Sep 2026')).toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Peran sari@klien.example' }),
      'Anggota',
    )
    expect(onChangeInvitationRole).toHaveBeenCalledWith('inv-1', 'Anggota')
    await user.click(screen.getByRole('button', { name: 'Batalkan undangan sari@klien.example' }))
    expect(onCancelInvitation).toHaveBeenCalledWith('inv-1')
  })

  it('undangan kedaluwarsa ditandai', () => {
    render(
      <ProjectMembersTable
        projectName="Sentul"
        members={[]}
        invitations={[{ ...SARI, expired: true }]}
        canManage
        onChangeRole={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByText('Undangan kedaluwarsa')).toBeInTheDocument()
  })

  it('pengelola bisa mengubah peran dan mengeluarkan anggota', async () => {
    const user = userEvent.setup()
    const onChangeRole = vi.fn()
    const onRemove = vi.fn()
    render(
      <ProjectMembersTable
        projectName="Sentul"
        members={MEMBERS}
        canManage
        onChangeRole={onChangeRole}
        onRemove={onRemove}
      />,
    )

    await user.selectOptions(screen.getByRole('combobox', { name: 'Peran Pak Budi' }), 'Anggota')
    expect(onChangeRole).toHaveBeenCalledWith('2', 'Anggota')
    await user.click(screen.getByRole('button', { name: 'Keluarkan Ahmad dari Sentul' }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('tanpa hak kelola: peran hanya teks, tidak ada kontrol ubah, dan Tamu tanpa email', () => {
    render(
      <ProjectMembersTable
        projectName="Sentul"
        members={MEMBERS}
        canManage={false}
        onChangeRole={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Pengelola')).toBeInTheDocument()
    expect(screen.getByText('ahmad@perusahaan.co.id')).toBeInTheDocument()
    expect(screen.queryByText(/@klien/)).not.toBeInTheDocument()
  })

  it('tanggal memakai format Indonesia dengan tahun', () => {
    render(
      <ProjectMembersTable
        projectName="Sentul"
        members={MEMBERS}
        canManage={false}
        onChangeRole={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByText('2 Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('3 Agu 2026')).toBeInTheDocument()
  })
})
