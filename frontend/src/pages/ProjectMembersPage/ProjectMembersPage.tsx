import { useState } from 'react'
import { messageOf } from '@/api/errors'
import { useCancelInvitation, useChangeInvitationRole, useInvitations } from '@/api/invitations'
import {
  useChangeProjectMemberRole,
  useProjectMembers,
  useRemoveProjectMember,
} from '@/api/projects'
import { useProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { FormDialog } from '@/components/organisms/FormDialog'
import { ProjectMembersTable } from '@/components/organisms/ProjectMembersTable'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import type { ProjectMemberItem } from '@/types/api'
import { ProjectAddMember } from './ProjectAddMember'
import './ProjectMembersPage.css'

/**
 * Tab Anggota proyek (mockup 08). Anggota berlaku untuk proyek teratas dan semua sub-proyeknya, jadi
 * daftarnya sama dari sub-proyek mana pun. Pengelola dan Admin juga melihat undangan yang belum diterima
 * (status "Menunggu diterima"); tombol Undang ada di kepala halaman proyek.
 */
export function ProjectMembersPage() {
  const { project } = useProjectContext()
  useDocumentTitle(`Anggota ${project.name}`)
  const toast = useToast()
  const members = useProjectMembers(project.id)
  const canManage = project.canManage

  const invitations = useInvitations(project.id, canManage)
  const [removing, setRemoving] = useState<ProjectMemberItem | null>(null)
  const changeInvitationRole = useChangeInvitationRole()
  const cancelInvitation = useCancelInvitation()

  const changeRole = useChangeProjectMemberRole(project.id)
  const remove = useRemoveProjectMember(project.id)

  if (members.isPending) return <p role="status">Memuat anggota…</p>
  if (members.isError) {
    return (
      <EmptyState
        title="Daftar anggota tidak bisa dimuat"
        description={messageOf(members.error)}
        action={<Button onClick={() => void members.refetch()}>Coba lagi</Button>}
      />
    )
  }

  // Undangan yang menunggu ikut dihitung (mockup 08: "10 orang" termasuk Sari yang belum menerima)
  const pending = invitations.data ?? []
  const pendingOf = (role: string) => pending.filter((i) => i.role === role).length
  const counts = {
    total: project.memberCounts.total + pending.length,
    pengelola: project.memberCounts.pengelola + pendingOf('Pengelola'),
    anggota: project.memberCounts.anggota + pendingOf('Anggota'),
    tamu: project.memberCounts.tamu + pendingOf('Tamu'),
  }
  const busyId = changeRole.isPending
    ? changeRole.variables.userId
    : changeInvitationRole.isPending
      ? changeInvitationRole.variables.id
      : cancelInvitation.isPending
        ? cancelInvitation.variables
        : null

  return (
    <>
      <p className="ar-pmpage-summary">
        <span>
          <b>{counts.total}</b> orang
        </span>
        <span>
          {counts.pengelola} Pengelola · {counts.anggota} Anggota · {counts.tamu} Tamu
        </span>
      </p>

      {canManage ? (
        <div className="ar-card ar-pmpage-add">
          <ProjectAddMember key={project.rootId} projectId={project.id} />
        </div>
      ) : null}

      <ProjectMembersTable
        projectName={project.path[0]?.name ?? project.name}
        members={members.data}
        invitations={pending}
        canManage={canManage}
        busyId={busyId}
        onChangeRole={(userId, next) =>
          changeRole.mutate(
            { userId, role: next },
            { onError: (error) => toast.error(messageOf(error)) },
          )
        }
        onRemove={(userId) => setRemoving(members.data.find((m) => m.userId === userId) ?? null)}
        onChangeInvitationRole={(id, role) =>
          changeInvitationRole.mutate(
            { id, role },
            { onError: (error) => toast.error(messageOf(error)) },
          )
        }
        onCancelInvitation={(id) => {
          const email = pending.find((i) => i.id === id)?.email ?? ''
          cancelInvitation.mutate(id, {
            onSuccess: () => toast.success(`Undangan ${email} dibatalkan`),
            onError: (error) => toast.error(messageOf(error)),
          })
        }}
      />

      <FormDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Keluarkan ${removing?.displayName ?? ''} dari proyek?`}
        description="Orang ini tidak lagi bisa membuka proyek ini dan semua sub-proyeknya."
        fields={[]}
        submitLabel="Keluarkan"
        submitting={remove.isPending}
        formError={remove.isError ? messageOf(remove.error) : undefined}
        onSubmit={() => {
          if (!removing) return
          remove.mutate(removing.userId, {
            onSuccess: () => {
              toast.success(`${removing.displayName} dikeluarkan dari proyek`)
              setRemoving(null)
            },
          })
        }}
      />
    </>
  )
}
