import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { UserSummary } from '@/types/api'
import { UsersTable } from './UsersTable'

const make = (over: Partial<UserSummary>): UserSummary => ({
  id: 'u',
  email: 'u@perusahaan.co.id',
  displayName: 'U',
  isAdmin: false,
  isActive: true,
  isGuest: false,
  createdAt: '2026-06-01T00:00:00Z',
  teams: [],
  ...over,
})

const USERS = [
  make({
    id: 'a',
    displayName: 'Ahmad',
    email: 'ahmad@perusahaan.co.id',
    isAdmin: true,
    teams: ['Tim Sentul'],
  }),
  make({ id: 'r', displayName: 'Rama', email: 'rama@perusahaan.co.id' }),
  make({ id: 'b', displayName: 'Pak Budi', email: 'budi@klien.example', isGuest: true }),
  make({ id: 'x', displayName: 'Lama', email: 'lama@perusahaan.co.id', isActive: false }),
]

const rowOf = (email: string) => screen.getByText(email).closest('tr') as HTMLElement

describe('UsersTable', () => {
  it('menampilkan label status: Admin, Tamu, Nonaktif', () => {
    render(
      <UsersTable
        users={USERS}
        currentUserId="a"
        onToggleAdmin={() => {}}
        onToggleActive={() => {}}
      />,
    )
    expect(within(rowOf('ahmad@perusahaan.co.id')).getByText('Admin')).toBeInTheDocument()
    expect(within(rowOf('budi@klien.example')).getByText('Tamu')).toBeInTheDocument()
    expect(within(rowOf('lama@perusahaan.co.id')).getByText('Nonaktif')).toBeInTheDocument()
  })

  it('tidak ada aksi pada diri sendiri; Tamu tidak bisa dijadikan admin', () => {
    render(
      <UsersTable
        users={USERS}
        currentUserId="a"
        onToggleAdmin={() => {}}
        onToggleActive={() => {}}
      />,
    )
    expect(within(rowOf('ahmad@perusahaan.co.id')).queryByRole('button')).not.toBeInTheDocument()
    expect(
      within(rowOf('budi@klien.example')).queryByRole('button', { name: /admin/i }),
    ).not.toBeInTheDocument()
    expect(
      within(rowOf('budi@klien.example')).getByRole('button', { name: 'Nonaktifkan' }),
    ).toBeInTheDocument()
  })

  it('tombol sesuai keadaan: Aktifkan untuk yang nonaktif, Jadikan admin untuk anggota biasa', async () => {
    const onToggleAdmin = vi.fn()
    const onToggleActive = vi.fn()
    const user = userEvent.setup()
    render(
      <UsersTable
        users={USERS}
        currentUserId="a"
        onToggleAdmin={onToggleAdmin}
        onToggleActive={onToggleActive}
      />,
    )
    await user.click(
      within(rowOf('rama@perusahaan.co.id')).getByRole('button', { name: 'Jadikan admin' }),
    )
    expect(onToggleAdmin).toHaveBeenCalledWith(USERS[1])
    await user.click(
      within(rowOf('lama@perusahaan.co.id')).getByRole('button', { name: 'Aktifkan' }),
    )
    expect(onToggleActive).toHaveBeenCalledWith(USERS[3])
  })

  it('tombol baris yang sedang diproses dinonaktifkan', () => {
    render(
      <UsersTable
        users={USERS}
        currentUserId="a"
        onToggleAdmin={() => {}}
        onToggleActive={() => {}}
        busyUserId="r"
      />,
    )
    for (const b of within(rowOf('rama@perusahaan.co.id')).getAllByRole('button'))
      expect(b).toBeDisabled()
  })
})
