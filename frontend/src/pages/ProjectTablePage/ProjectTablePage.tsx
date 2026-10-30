import { useMemo, useState } from 'react'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { useProjectMembers, useProjectTree } from '@/api/projects'
import { useLabels, useSetTaskStatus } from '@/api/tasks'
import { useProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { FilterBar } from '@/components/organisms/FilterBar'
import { HoldReasonDialog } from '@/components/organisms/HoldReasonDialog'
import { TaskTable } from '@/components/organisms/TaskTable'
import { useTaskParam } from '@/hooks/useTaskParam'
import { useToast } from '@/hooks/useToast'
import {
  isHeld,
  statusFromApi,
  statusToApi,
  type HeldStatusKey,
  type StatusKey,
} from '@/lib/status'
import { EMPTY_FILTERS, hasActiveFilters } from '@/lib/taskFilters'
import { buildTaskGroups } from '@/lib/taskGroups'
import type { TaskRow } from '@/types/api'

/**
 * Tab Tabel: filter, grup sub-proyek, dan ubah status langsung dari baris. Klik judul membuka drawer detail
 * (TaskDrawerPage), tempat semua field lain diubah.
 */
export function ProjectTablePage() {
  const { project, tasks, filters, onFiltersChange, onCreateTask } = useProjectContext()
  const toast = useToast()
  const taskParam = useTaskParam()
  const tree = useProjectTree()
  const members = useProjectMembers(project.id)
  const labels = useLabels(project.id)
  const setStatus = useSetTaskStatus()

  const [hold, setHold] = useState<{ task: TaskRow; status: HeldStatusKey } | null>(null)

  const people = useMemo(
    () =>
      (members.data ?? [])
        .filter((m) => m.role !== 'Tamu')
        .map((m) => ({ id: m.userId, name: m.displayName })),
    [members.data],
  )
  const labelNames = useMemo(() => (labels.data ?? []).map((l) => l.name), [labels.data])
  const filtered = hasActiveFilters(filters)

  const groups = useMemo(
    () => buildTaskGroups(tree.data ?? [], project.id, tasks.data?.tasks ?? [], true),
    [tree.data, project.id, tasks.data],
  )

  if (tasks.isPending || tree.isPending) return <p role="status">Memuat task…</p>
  if (tasks.isError) {
    return (
      <EmptyState
        title="Task tidak bisa dimuat"
        description={messageOf(tasks.error)}
        action={<Button onClick={() => void tasks.refetch()}>Coba lagi</Button>}
      />
    )
  }

  const canEdit = tasks.data.canEdit
  const totalTasks = tasks.data.tasks.length

  function changeStatus(task: TaskRow, key: StatusKey) {
    if (key === statusFromApi(task.status)) return
    if (isHeld(key)) {
      setHold({ task, status: key })
      return
    }
    setStatus.mutate(
      { id: task.id, status: statusToApi(key) },
      { onError: (error) => toast.error(messageOf(error)) },
    )
  }

  return (
    <>
      <FilterBar filters={filters} onChange={onFiltersChange} people={people} labels={labelNames} />

      <TaskTable
        groups={groups}
        canEdit={canEdit}
        today={tasks.data.today}
        onChangeStatus={changeStatus}
        onOpenTask={(task) => taskParam.open(task.key)}
        empty={
          filtered && totalTasks === 0 ? (
            <EmptyState
              icon="search"
              title="Tidak ada task yang cocok"
              description="Coba ubah atau hapus filternya."
              action={
                <Button onClick={() => onFiltersChange(EMPTY_FILTERS)}>Hapus semua filter</Button>
              }
            />
          ) : (
            <EmptyState
              icon="folder"
              title="Belum ada task"
              description={
                canEdit
                  ? 'Tambahkan task pertama untuk proyek ini.'
                  : 'Task yang ditambahkan anggota proyek akan muncul di sini.'
              }
              action={
                canEdit ? (
                  <Button variant="primary" icon="plus" onClick={onCreateTask}>
                    Tambah task
                  </Button>
                ) : undefined
              }
            />
          )
        }
      />

      {hold ? (
        <HoldReasonDialog
          open
          onClose={() => {
            setHold(null)
            setStatus.reset()
          }}
          status={hold.status}
          taskLabel={`${hold.task.key} ${hold.task.title}`}
          people={people}
          submitting={setStatus.isPending}
          fieldErrors={setStatus.isError ? fieldErrorsOf(setStatus.error) : undefined}
          formError={
            setStatus.isError && Object.keys(fieldErrorsOf(setStatus.error)).length === 0
              ? messageOf(setStatus.error)
              : undefined
          }
          onSubmit={(values) =>
            setStatus.mutate(
              {
                id: hold.task.id,
                status: statusToApi(hold.status),
                holdReason: values.holdReason,
                waitingOnUserId: values.waitingOnUserId,
                waitingOnText: values.waitingOnText || undefined,
              },
              { onSuccess: () => setHold(null) },
            )
          }
        />
      ) : null}
    </>
  )
}
