import { Button } from '@/components/atoms/Button'
import { Label } from '@/components/atoms/Label'
import { DataTable, type Column } from '@/components/molecules/DataTable'
import { PersonCell } from '@/components/molecules/PersonCell'
import type { UserSummary } from '@/types/api'
import './UsersTable.css'

export interface UsersTableProps {
  users: UserSummary[]
  /** Id pengguna yang sedang login: aksi pada diri sendiri disembunyikan (server juga menolaknya). */
  currentUserId: string
  onToggleAdmin: (user: UserSummary) => void
  onToggleActive: (user: UserSummary) => void
  busyUserId?: string | null
}

/** Daftar semua pengguna untuk Admin (halaman Pengaturan). */
export function UsersTable({
  users,
  currentUserId,
  onToggleAdmin,
  onToggleActive,
  busyUserId,
}: UsersTableProps) {
  const columns: Column<UserSummary>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (u) => <PersonCell name={u.displayName} email={u.email} guest={u.isGuest} />,
    },
    {
      key: 'teams',
      header: 'Tim',
      width: 230,
      render: (u) => (
        <span className="ar-users-labels">
          {u.teams.map((t) => (
            <Label key={t}>{t}</Label>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 170,
      render: (u) => (
        <span className="ar-users-labels">
          {u.isAdmin ? <Label>Admin</Label> : null}
          {u.isGuest ? <Label>Tamu</Label> : null}
          {u.isActive ? null : <Label>Nonaktif</Label>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      headerHidden: true,
      width: 290,
      align: 'right',
      render: (u) =>
        u.id === currentUserId ? null : (
          <span className="ar-users-actions">
            {u.isGuest ? null : (
              <Button
                size="sm"
                variant="ghost"
                disabled={busyUserId === u.id}
                onClick={() => onToggleAdmin(u)}
              >
                {u.isAdmin ? 'Cabut admin' : 'Jadikan admin'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={busyUserId === u.id}
              onClick={() => onToggleActive(u)}
            >
              {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
          </span>
        ),
    },
  ]

  return (
    <section className="ar-card ar-users">
      <DataTable caption="Semua pengguna" columns={columns} rows={users} rowKey={(u) => u.id} />
    </section>
  )
}
