import { useState } from 'react'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useUpdateMilestone,
} from '@/api/milestones'
import { useProjectTree } from '@/api/projects'
import { useProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { FormDialog } from '@/components/organisms/FormDialog'
import { MilestoneFormDialog } from '@/components/organisms/MilestoneFormDialog'
import { MilestoneTable } from '@/components/organisms/MilestoneTable'
import { useToast } from '@/hooks/useToast'
import { projectOptions } from '@/lib/taskGroups'
import type { MilestoneItem } from '@/types/api'
import './ProjectMilestonesPage.css'

/**
 * Tab Milestone: daftar sederhana milestone proyek dan sub-proyeknya. Semua anggota (termasuk Tamu) melihat;
 * hanya Pengelola dan Admin yang menambah, mengubah, menghapus, dan menandai selesai.
 */
export function ProjectMilestonesPage() {
  const { project } = useProjectContext()
  const toast = useToast()
  const tree = useProjectTree()
  const milestones = useMilestones(project.id)
  const create = useCreateMilestone()
  const update = useUpdateMilestone()
  const remove = useDeleteMilestone()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MilestoneItem | null>(null)
  const [deleting, setDeleting] = useState<MilestoneItem | null>(null)

  const canManage = project.canManage
  const places = projectOptions(tree.data ?? [], project.id)
  const year = new Date().getFullYear()

  if (milestones.isPending) return <p role="status">Memuat milestone…</p>
  if (milestones.isError) {
    return (
      <EmptyState
        title="Milestone tidak bisa dimuat"
        description={messageOf(milestones.error)}
        action={<Button onClick={() => void milestones.refetch()}>Coba lagi</Button>}
      />
    )
  }

  return (
    <div className="ar-card">
      <div className="ar-milestonepage-head">
        <h2>Milestone</h2>
        {canManage ? (
          <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
            Tambah milestone
          </Button>
        ) : null}
      </div>
      <MilestoneTable
        milestones={milestones.data}
        canManage={canManage}
        currentYear={year}
        onEdit={setEditing}
        onDelete={setDeleting}
        onToggleDone={(milestone, done) =>
          update.mutate(
            { id: milestone.id, isDone: done },
            { onError: (error) => toast.error(messageOf(error)) },
          )
        }
        empty={
          <EmptyState
            icon="milestone"
            title="Belum ada milestone"
            description={
              canManage
                ? 'Tambahkan tonggak penting proyek, mis. UAT atau Go-Live; tampil di Gantt.'
                : 'Milestone yang ditambahkan Pengelola proyek akan muncul di sini.'
            }
          />
        }
      />

      <MilestoneFormDialog
        open={adding}
        onClose={() => {
          setAdding(false)
          create.reset()
        }}
        title="Tambah milestone"
        submitLabel="Tambah milestone"
        initial={{ projectId: project.id }}
        projects={places}
        submitting={create.isPending}
        fieldErrors={create.isError ? fieldErrorsOf(create.error) : undefined}
        formError={
          create.isError && Object.keys(fieldErrorsOf(create.error)).length === 0
            ? messageOf(create.error)
            : undefined
        }
        onSubmit={(values) =>
          create.mutate(
            { projectId: values.projectId, name: values.name, date: values.date },
            {
              onSuccess: (created) => {
                setAdding(false)
                toast.success(`Milestone ${created.name} ditambahkan`)
              },
            },
          )
        }
      />

      <MilestoneFormDialog
        open={editing !== null}
        onClose={() => {
          setEditing(null)
          update.reset()
        }}
        title="Ubah milestone"
        submitLabel="Simpan"
        showDone
        initial={
          editing
            ? {
                name: editing.name,
                date: editing.date,
                projectId: editing.projectId,
                isDone: editing.isDone,
              }
            : undefined
        }
        projects={places}
        submitting={update.isPending}
        fieldErrors={update.isError ? fieldErrorsOf(update.error) : undefined}
        formError={
          update.isError && Object.keys(fieldErrorsOf(update.error)).length === 0
            ? messageOf(update.error)
            : undefined
        }
        onSubmit={(values) => {
          if (!editing) return
          update.mutate(
            {
              id: editing.id,
              name: values.name,
              date: values.date,
              projectId: values.projectId,
              isDone: values.isDone,
            },
            {
              onSuccess: () => {
                setEditing(null)
                toast.success('Milestone disimpan')
              },
            },
          )
        }}
      />

      <FormDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null)
          remove.reset()
        }}
        title={`Hapus milestone ${deleting?.name ?? ''}?`}
        description="Milestone ini hilang dari daftar dan Gantt. Tindakan ini tidak bisa dibatalkan."
        fields={[]}
        submitLabel="Hapus milestone"
        submitting={remove.isPending}
        formError={remove.isError ? messageOf(remove.error) : undefined}
        onSubmit={() => {
          if (!deleting) return
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`Milestone ${deleting.name} dihapus`)
              setDeleting(null)
            },
          })
        }}
      />
    </div>
  )
}
