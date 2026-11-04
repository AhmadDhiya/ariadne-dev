import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { DataTable, type Column } from '@/components/molecules/DataTable'
import { PersonCell } from '@/components/molecules/PersonCell'
import { formatDateWithYear } from '@/lib/dates'
import type { InvitationItem, ProjectMemberItem, ProjectRole } from '@/types/api'
import './ProjectMembersTable.css'

export interface ProjectMembersTableProps {
  projectName: string
  members: ProjectMemberItem[]
  /** Undangan yang belum diterima; tampil di bawah anggota dengan status "Menunggu diterima". */
  invitations?: InvitationItem[]
  /** Pengelola atau Admin: boleh mengubah peran dan mengeluarkan anggota. */
  canManage: boolean
  onChangeRole: (userId: string, role: ProjectRole) => void
  onRemove: (userId: string) => void
  onChangeInvitationRole?: (invitationId: string, role: ProjectRole) => void
  onCancelInvitation?: (invitationId: string) => void
  /** Baris yang sedang disimpan (id pengguna atau id undangan). */
  busyId?: string | null
}

const ROLES: ProjectRole[] = ['Pengelola', 'Anggota', 'Tamu']

interface Row {
  key: string
  name: string
  email: string | null
  guest: boolean
  role: ProjectRole
  status: string
  pending: boolean
  date: string
  onRole: (role: ProjectRole) => void
  action: string
  actionLabel: string
  onAction: () => void
}

/** Nama sementara untuk undangan (belum ada nama): bagian depan email, huruf pertama besar ("sari@…" → "Sari"). */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local.charAt(0).toUpperCase() + local.slice(1)
}

/** Tabel anggota proyek (mockup 08): Nama, Peran, Status, Ditambahkan, Keluarkan / Batalkan. */
export function ProjectMembersTable({
  projectName,
  members,
  invitations = [],
  canManage,
  onChangeRole,
  onRemove,
  onChangeInvitationRole,
  onCancelInvitation,
  busyId,
}: ProjectMembersTableProps) {
  const rows: Row[] = [
    ...members.map((m): Row => ({
      key: m.userId,
      name: m.displayName,
      email: m.email,
      guest: m.isGuest,
      role: m.role,
      status: m.status,
      pending: m.status !== 'Aktif',
      date: m.addedAt,
      onRole: (role) => onChangeRole(m.userId, role),
      action: 'Keluarkan',
      actionLabel: `Keluarkan ${m.displayName} dari ${projectName}`,
      onAction: () => onRemove(m.userId),
    })),
    ...invitations.map((i): Row => ({
      key: i.id,
      name: nameFromEmail(i.email),
      email: i.email,
      guest: i.role === 'Tamu',
      role: i.role,
      status: i.expired ? 'Undangan kedaluwarsa' : 'Menunggu diterima',
      pending: true,
      date: i.createdAt,
      onRole: (role) => onChangeInvitationRole?.(i.id, role),
      action: 'Batalkan',
      actionLabel: `Batalkan undangan ${i.email}`,
      onAction: () => onCancelInvitation?.(i.id),
    })),
  ]

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (r) => <PersonCell name={r.name} email={r.email} guest={r.guest} />,
    },
    {
      key: 'role',
      header: 'Peran',
      width: 160,
      render: (r) =>
        canManage ? (
          <Select
            size="sm"
            aria-label={`Peran ${r.pending ? r.email : r.name}`}
            value={r.role}
            disabled={busyId === r.key}
            onChange={(e) => r.onRole(e.target.value as ProjectRole)}
          >
            {ROLES.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </Select>
        ) : (
          r.role
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 190,
      render: (r) => <span className={r.pending ? 'ar-pm-pending' : undefined}>{r.status}</span>,
    },
    {
      key: 'added',
      header: 'Ditambahkan',
      width: 140,
      render: (r) => <span className="ar-muted">{formatDateWithYear(r.date)}</span>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Aksi',
            headerHidden: true,
            width: 120,
            align: 'right' as const,
            render: (r: Row) => (
              <Button
                variant="ghost"
                size="sm"
                aria-label={r.actionLabel}
                disabled={busyId === r.key}
                onClick={r.onAction}
              >
                {r.action}
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
        rows={rows}
        rowKey={(r) => r.key}
        empty={<p className="ar-pm-empty">Belum ada anggota.</p>}
      />
    </section>
  )
}
