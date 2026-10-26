import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import {
  useChangeTeamMemberRole,
  useCreateTeam,
  useRemoveTeamMember,
  useRenameTeam,
  useTeam,
  useTeams,
} from '@/api/teams'
import { useAppContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { PageHeader } from '@/components/molecules/PageHeader'
import { FormDialog } from '@/components/organisms/FormDialog'
import { TeamList } from '@/components/organisms/TeamList'
import { TeamMembersPanel } from '@/components/organisms/TeamMembersPanel'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { TeamMemberItem } from '@/types/api'
import { TeamAddMember } from './TeamAddMember'
import './TeamsPage.css'

/** Halaman Tim (mockup 07): daftar tim di kiri, anggota tim terpilih di kanan. */
export function TeamsPage() {
  const { me } = useAppContext()
  useDocumentTitle('Tim')
  const navigate = useNavigate()
  const { teamId } = useParams()
  const toast = useToast()

  const teams = useTeams(!me.isGuestOnly)
  const selectedId = teamId ?? teams.data?.[0]?.id
  const team = useTeam(selectedId)

  const [dialog, setDialog] = useState<'create' | 'rename' | null>(null)
  const [removing, setRemoving] = useState<TeamMemberItem | null>(null)

  const create = useCreateTeam()
  const rename = useRenameTeam(selectedId ?? '')
  const changeRole = useChangeTeamMemberRole(selectedId ?? '')
  const remove = useRemoveTeamMember(selectedId ?? '')

  if (me.isGuestOnly) return <NotFoundPage />

  const closeDialog = () => {
    setDialog(null)
    create.reset()
    rename.reset()
  }

  const createButton = me.isAdmin ? (
    <Button variant="primary" icon="plus" onClick={() => setDialog('create')}>
      Buat tim
    </Button>
  ) : undefined

  let content
  if (teams.isPending) {
    content = <p role="status">Memuat tim…</p>
  } else if (teams.isError) {
    content = (
      <EmptyState
        title="Daftar tim tidak bisa dimuat"
        description={messageOf(teams.error)}
        action={<Button onClick={() => void teams.refetch()}>Coba lagi</Button>}
      />
    )
  } else if (teams.data.length === 0) {
    content = (
      <div className="ar-card">
        <EmptyState
          icon="users"
          title="Belum ada tim"
          description={
            me.isAdmin
              ? 'Buat tim pertama, lalu tambahkan supervisor dan anggotanya.'
              : 'Anda belum tergabung di tim mana pun. Hubungi admin.'
          }
          action={createButton}
        />
      </div>
    )
  } else {
    content = (
      <div className="ar-teams-layout">
        <TeamList
          teams={teams.data}
          selectedId={selectedId ?? null}
          onNavigate={(href) => void navigate(href)}
        />
        {team.isPending ? (
          <p role="status">Memuat tim…</p>
        ) : team.isError ? (
          <EmptyState title="Tim tidak ditemukan" description={messageOf(team.error)} />
        ) : (
          <TeamMembersPanel
            team={team.data}
            busyUserId={changeRole.isPending ? changeRole.variables.userId : null}
            onRename={() => setDialog('rename')}
            onChangeRole={(userId, next) =>
              changeRole.mutate(
                { userId, role: next },
                { onError: (error) => toast.error(messageOf(error)) },
              )
            }
            onRemove={(userId) =>
              setRemoving(team.data.members.find((m) => m.userId === userId) ?? null)
            }
            addMember={
              team.data.canManage ? (
                <TeamAddMember key={team.data.id} teamId={team.data.id} teamName={team.data.name} />
              ) : undefined
            }
          />
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Tim"
        description="Satu orang bisa masuk beberapa tim, dan satu supervisor bisa memegang beberapa tim."
        actions={createButton}
      />
      {content}

      <FormDialog
        open={dialog === 'create'}
        onClose={closeDialog}
        title="Buat tim"
        fields={[
          {
            name: 'name',
            label: 'Nama tim',
            maxLength: 100,
            placeholder: 'mis. Tim Infrastruktur',
          },
        ]}
        submitLabel="Buat tim"
        submitting={create.isPending}
        fieldErrors={create.isError ? fieldErrorsOf(create.error) : undefined}
        formError={
          create.isError && !fieldErrorsOf(create.error).name ? messageOf(create.error) : undefined
        }
        onSubmit={(values) =>
          create.mutate(String(values.name).trim(), {
            onSuccess: (created) => {
              closeDialog()
              toast.success(`${created.name} dibuat`)
              void navigate(`/tim/${created.id}`)
            },
          })
        }
      />
      <FormDialog
        open={dialog === 'rename'}
        onClose={closeDialog}
        title="Ubah tim"
        fields={[{ name: 'name', label: 'Nama tim', maxLength: 100 }]}
        initialValues={{ name: team.data?.name ?? '' }}
        submitLabel="Simpan"
        submitting={rename.isPending}
        fieldErrors={rename.isError ? fieldErrorsOf(rename.error) : undefined}
        formError={
          rename.isError && !fieldErrorsOf(rename.error).name ? messageOf(rename.error) : undefined
        }
        onSubmit={(values) =>
          rename.mutate(String(values.name).trim(), {
            onSuccess: () => {
              closeDialog()
              toast.success('Nama tim disimpan')
            },
          })
        }
      />
      <FormDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Keluarkan ${removing?.displayName ?? ''} dari ${team.data?.name ?? 'tim'}?`}
        description="Orang ini tidak lagi terlihat sebagai anggota tim. Peran dan akses proyeknya tidak berubah."
        fields={[]}
        submitLabel="Keluarkan"
        submitting={remove.isPending}
        formError={remove.isError ? messageOf(remove.error) : undefined}
        onSubmit={() => {
          if (!removing) return
          remove.mutate(removing.userId, {
            onSuccess: () => {
              toast.success(`${removing.displayName} dikeluarkan dari tim`)
              setRemoving(null)
            },
          })
        }}
      />
    </>
  )
}
