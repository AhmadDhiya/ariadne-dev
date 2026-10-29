import { useMemo, useState } from 'react'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { useProjectMembers, useProjectTree } from '@/api/projects'
import {
  useCreateSubtask,
  useDeleteTask,
  useLabels,
  useSaveTask,
  useSetTaskStatus,
  useTask,
} from '@/api/tasks'
import { useProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { FilterBar } from '@/components/organisms/FilterBar'
import { FormDialog } from '@/components/organisms/FormDialog'
import { HoldReasonDialog } from '@/components/organisms/HoldReasonDialog'
import { TaskFormDialog, type TaskFormValues } from '@/components/organisms/TaskFormDialog'
import { TaskTable } from '@/components/organisms/TaskTable'
import { useToast } from '@/hooks/useToast'
import {
  isHeld,
  statusFromApi,
  statusToApi,
  type HeldStatusKey,
  type StatusKey,
} from '@/lib/status'
import { EMPTY_FILTERS, hasActiveFilters } from '@/lib/taskFilters'
import { toTaskPayload } from '@/lib/taskForm'
import { buildTaskGroups, projectOptions } from '@/lib/taskGroups'
import type { TaskRow } from '@/types/api'

/** Tab Tabel: filter, grup sub-proyek, ubah status langsung, dan dialog ubah / hapus task. */
export function ProjectTablePage() {
  const { project, tasks, filters, onFiltersChange, onCreateTask } = useProjectContext()
  const toast = useToast()
  const tree = useProjectTree()
  const members = useProjectMembers(project.id)
  const labels = useLabels(project.id)
  const setStatus = useSetTaskStatus()
  const saveTask = useSaveTask()
  const deleteTask = useDeleteTask()
  const createSubtask = useCreateSubtask()

  const [hold, setHold] = useState<{ task: TaskRow; status: HeldStatusKey } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [subtaskOf, setSubtaskOf] = useState<TaskRow | null>(null)
  const [deleting, setDeleting] = useState<TaskRow | null>(null)
  const editing = useTask(editingId ?? undefined)

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

  const detail = editing.data
  const subProjects = projectOptions(tree.data ?? [], project.id)

  return (
    <>
      <FilterBar filters={filters} onChange={onFiltersChange} people={people} labels={labelNames} />

      <TaskTable
        groups={groups}
        canEdit={canEdit}
        onChangeStatus={changeStatus}
        onOpenTask={canEdit ? (task) => setEditingId(task.id) : undefined}
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

      <TaskFormDialog
        open={editingId !== null && detail !== undefined}
        onClose={() => {
          setEditingId(null)
          saveTask.reset()
        }}
        title={detail ? `Ubah ${detail.task.key}` : 'Ubah task'}
        submitLabel="Simpan"
        initial={
          detail
            ? {
                title: detail.task.title,
                description: detail.description ?? '',
                priority: detail.task.priority,
                projectId: detail.task.projectId,
                assigneeIds: detail.task.assignees.map((a) => a.id),
                start: detail.task.startDate ?? '',
                end: detail.task.dueDate ?? '',
                labels: detail.task.labels.join(', '),
              }
            : undefined
        }
        projects={detail && detail.task.parentTaskId === null ? subProjects : []}
        people={people}
        knownLabels={labelNames}
        submitting={saveTask.isPending}
        fieldErrors={saveTask.isError ? fieldErrorsOf(saveTask.error) : undefined}
        formError={
          saveTask.isError && Object.keys(fieldErrorsOf(saveTask.error)).length === 0
            ? messageOf(saveTask.error)
            : undefined
        }
        onAddSubtask={
          detail && detail.task.parentTaskId === null
            ? () => {
                setSubtaskOf(detail.task)
                setEditingId(null)
              }
            : undefined
        }
        onDelete={
          detail
            ? () => {
                setDeleting(detail.task)
                setEditingId(null)
              }
            : undefined
        }
        onSubmit={(values: TaskFormValues) => {
          if (!detail) return
          const payload = toTaskPayload(values)
          saveTask.mutate(
            {
              id: detail.task.id,
              changes: {
                title: payload.title,
                description: payload.description,
                priority: payload.priority,
                labels: payload.labels,
                ...(detail.task.parentTaskId === null && values.projectId !== detail.task.projectId
                  ? { projectId: values.projectId }
                  : {}),
              },
              assigneeIds: payload.assigneeIds,
              dates: { startDate: payload.startDate, dueDate: payload.dueDate },
            },
            {
              onSuccess: () => {
                setEditingId(null)
                toast.success(`${detail.task.key} disimpan`)
              },
            },
          )
        }}
      />

      <TaskFormDialog
        open={subtaskOf !== null}
        onClose={() => {
          setSubtaskOf(null)
          createSubtask.reset()
        }}
        title="Tambah sub-task"
        description={subtaskOf ? `Di bawah ${subtaskOf.key} ${subtaskOf.title}` : undefined}
        submitLabel="Tambah sub-task"
        projects={[]}
        people={people}
        knownLabels={labelNames}
        submitting={createSubtask.isPending}
        fieldErrors={createSubtask.isError ? fieldErrorsOf(createSubtask.error) : undefined}
        formError={
          createSubtask.isError && Object.keys(fieldErrorsOf(createSubtask.error)).length === 0
            ? messageOf(createSubtask.error)
            : undefined
        }
        onSubmit={(values) => {
          if (!subtaskOf) return
          createSubtask.mutate(
            { parentId: subtaskOf.id, ...toTaskPayload(values) },
            {
              onSuccess: (created) => {
                setSubtaskOf(null)
                toast.success(`Sub-task ${created.key} ditambahkan`)
              },
            },
          )
        }}
      />

      <FormDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null)
          deleteTask.reset()
        }}
        title={`Hapus ${deleting?.key ?? ''}?`}
        description={
          deleting
            ? `"${deleting.title}" disembunyikan beserta semua sub-tasknya. Datanya tidak hilang dari database.`
            : undefined
        }
        fields={[]}
        submitLabel="Hapus task"
        submitting={deleteTask.isPending}
        formError={deleteTask.isError ? messageOf(deleteTask.error) : undefined}
        onSubmit={() => {
          if (!deleting) return
          deleteTask.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`${deleting.key} dihapus`)
              setDeleting(null)
            },
          })
        }}
      />
    </>
  )
}
