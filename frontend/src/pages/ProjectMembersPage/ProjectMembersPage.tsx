import { useState } from 'react'
import { messageOf } from '@/api/errors'
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
 * daftarnya sama dari sub-proyek mana pun. "Undang tamu lewat email" dibuat di Fase 8.
 */
export function ProjectMembersPage() {
  const { project } = useProjectContext()
  useDocumentTitle(`Anggota ${project.name}`)
  const toast = useToast()
  const members = useProjectMembers(project.id)
  const canManage = project.canManage

  const [removing, setRemoving] = useState<ProjectMemberItem | null>(null)

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

  const counts = project.memberCounts

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
        canManage={canManage}
        busyUserId={changeRole.isPending ? changeRole.variables.userId : null}
        onChangeRole={(userId, next) =>
          changeRole.mutate(
            { userId, role: next },
            { onError: (error) => toast.error(messageOf(error)) },
          )
        }
        onRemove={(userId) => setRemoving(members.data.find((m) => m.userId === userId) ?? null)}
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
