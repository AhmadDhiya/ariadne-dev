import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { DataTable, type Column } from '@/components/molecules/DataTable'
import { PersonCell } from '@/components/molecules/PersonCell'
import { formatDateWithYear } from '@/lib/dates'
import type { ProjectMemberItem, ProjectRole } from '@/types/api'
import './ProjectMembersTable.css'

export interface ProjectMembersTableProps {
  projectName: string
  members: ProjectMemberItem[]
  /** Pengelola atau Admin: boleh mengubah peran dan mengeluarkan anggota. */
  canManage: boolean
  onChangeRole: (userId: string, role: ProjectRole) => void
  onRemove: (userId: string) => void
  busyUserId?: string | null
}

const ROLES: ProjectRole[] = ['Pengelola', 'Anggota', 'Tamu']

/** Tabel anggota proyek (mockup 08): Nama, Peran, Status, Ditambahkan, Keluarkan. */
export function ProjectMembersTable({
  projectName,
  members,
  canManage,
  onChangeRole,
  onRemove,
  busyUserId,
}: ProjectMembersTableProps) {
  const columns: Column<ProjectMemberItem>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (m) => <PersonCell name={m.displayName} email={m.email} guest={m.isGuest} />,
    },
    {
      key: 'role',
      header: 'Peran',
      width: 160,
      render: (m) =>
        canManage ? (
          <Select
            size="sm"
            aria-label={`Peran ${m.displayName}`}
            value={m.role}
            disabled={busyUserId === m.userId}
            onChange={(e) => onChangeRole(m.userId, e.target.value as ProjectRole)}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        ) : (
          m.role
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 190,
      render: (m) => (
        <span className={m.status === 'Aktif' ? undefined : 'ar-pm-pending'}>{m.status}</span>
      ),
    },
    {
      key: 'added',
      header: 'Ditambahkan',
      width: 140,
      render: (m) => <span className="ar-muted">{formatDateWithYear(m.addedAt)}</span>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Aksi',
            headerHidden: true,
            width: 120,
            align: 'right' as const,
            render: (m: ProjectMemberItem) => (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Keluarkan ${m.displayName} dari ${projectName}`}
                disabled={busyUserId === m.userId}
                onClick={() => onRemove(m.userId)}
              >
                Keluarkan
              </Button>
            ),
          },
        ]
      : []),
  ]

  return (
    <section className="ar-card ar-pm">
      <DataTable
        caption={`Anggota ${projectName}`}
        columns={columns}
        rows={members}
        rowKey={(m) => m.userId}
        empty={<p className="ar-pm-empty">Belum ada anggota.</p>}
      />
    </section>
  )
}
