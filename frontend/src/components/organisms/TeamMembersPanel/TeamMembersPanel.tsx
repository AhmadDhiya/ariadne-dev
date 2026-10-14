import type { ReactNode } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Button } from '@/components/atoms/Button'
import { Label } from '@/components/atoms/Label'
import { Select } from '@/components/atoms/Select'
import { DataTable, type Column } from '@/components/molecules/DataTable'
import { PersonCell } from '@/components/molecules/PersonCell'
import type { TeamDetail, TeamMemberItem, TeamRole } from '@/types/api'
import './TeamMembersPanel.css'

export interface TeamMembersPanelProps {
  team: TeamDetail
  /** Baris "Tambah anggota" (hanya diberikan bila boleh mengelola). */
  addMember?: ReactNode
  onRename: () => void
  onChangeRole: (userId: string, role: TeamRole) => void
  onRemove: (userId: string) => void
  /** Anggota yang sedang diubah, untuk menonaktifkan kontrolnya sementara. */
  busyUserId?: string | null
}

/** Panel kanan halaman Tim: judul tim, tambah anggota, dan tabel anggota (mockup 07). */
export function TeamMembersPanel({
  team,
  addMember,
  onRename,
  onChangeRole,
  onRemove,
  busyUserId,
}: TeamMembersPanelProps) {
  const supervisor = team.members.find((m) => m.role === 'Supervisor')

  const columns: Column<TeamMemberItem>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (m) => <PersonCell name={m.displayName} email={m.email} />,
    },
    {
      key: 'role',
      header: 'Peran di tim',
      width: 160,
      render: (m) =>
        team.canManage ? (
          <Select
            size="sm"
            aria-label={`Peran ${m.displayName}`}
            value={m.role}
            disabled={busyUserId === m.userId}
            onChange={(e) => onChangeRole(m.userId, e.target.value as TeamRole)}
          >
            <option value="Supervisor">Supervisor</option>
            <option value="Anggota">Anggota</option>
          </Select>
        ) : (
          m.role
        ),
    },
    {
      key: 'others',
      header: 'Tim lain',
      width: 210,
      render: (m) => (
        <span className="ar-teampanel-labels">
          {m.otherTeams.map((name) => (
            <Label key={name}>{name}</Label>
          ))}
        </span>
      ),
    },
    ...(team.canManage
      ? [
          {
            key: 'actions',
            header: 'Aksi',
            headerHidden: true,
            width: 120,
            align: 'right' as const,
            render: (m: TeamMemberItem) => (
              <Button
                variant="ghost"
                size="sm"
                icon="x"
                aria-label={`Keluarkan ${m.displayName} dari ${team.name}`}
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
    <section className="ar-card ar-teampanel" aria-labelledby="team-panel-title">
      <div className="ar-teampanel-head">
        <div className="ar-teampanel-title">
          <h2 id="team-panel-title">{team.name}</h2>
          <div className="ar-teampanel-meta">
            Supervisor:
            {supervisor ? (
              <>
                <Avatar name={supervisor.displayName} size={22} />
                <span className="ar-teampanel-sup">{team.supervisors.join(', ')}</span>
              </>
            ) : (
              <span>belum ada</span>
            )}
            {team.projects.length > 0 ? <span>· Proyek: {team.projects.join(', ')}</span> : null}
          </div>
        </div>
        {team.canManage ? (
          <Button size="sm" icon="settings" onClick={onRename}>
            Ubah tim
          </Button>
        ) : null}
      </div>
      {addMember}
      <DataTable
        caption={`Anggota ${team.name}`}
        columns={columns}
        rows={team.members}
        rowKey={(m) => m.userId}
        empty={<p className="ar-teampanel-empty">Tim ini belum punya anggota.</p>}
      />
    </section>
  )
}
