import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { useCreateActivity, useTaskActivities } from '@/api/activities'
import { ApiError } from '@/api/client'
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
import { FormDialog } from '@/components/organisms/FormDialog'
import { HoldReasonDialog } from '@/components/organisms/HoldReasonDialog'
import {
  TaskDrawer,
  type HoldValues,
  type TaskFieldChanges,
} from '@/components/organisms/TaskDrawer'
import { TaskFormDialog } from '@/components/organisms/TaskFormDialog'
import { useTaskParam } from '@/hooks/useTaskParam'
import { useToast } from '@/hooks/useToast'
import { isHeld, statusToApi, type HeldStatusKey, type StatusKey } from '@/lib/status'
import { toTaskPayload } from '@/lib/taskForm'
import { projectOptions } from '@/lib/taskGroups'

/**
 * Drawer detail task, dibuka dari halaman mana pun lewat ?task=SEN-115 (tabel proyek sekarang, dashboard nanti).
 * Halaman inilah yang memanggil API; komponen drawer hanya menerima data lewat props.
 */
export function TaskDrawerPage() {
  const { key, open, close } = useTaskParam()
  const location = useLocation()
  const toast = useToast()
  const detail = useTask(key)
  const task = detail.data?.task
  const rootId = detail.data?.rootProjectId
  const members = useProjectMembers(rootId)
  const labels = useLabels(rootId)
  const tree = useProjectTree()
  const activities = useTaskActivities(task?.id)
  const saveTask = useSaveTask()
  const setStatus = useSetTaskStatus()
  const createActivity = useCreateActivity()
  const createSubtask = useCreateSubtask()
  const deleteTask = useDeleteTask()
  const [hold, setHold] = useState<HeldStatusKey | null>(null)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const people = useMemo(
    () => (members.data ?? []).map((m) => ({ id: m.userId, name: m.displayName, role: m.role })),
    [members.data],
  )
  const assignable = useMemo(() => people.filter((p) => p.role !== 'Tamu'), [people])
  const knownLabels = useMemo(() => (labels.data ?? []).map((l) => l.name), [labels.data])
  const subProjects = useMemo(
    () => (rootId ? projectOptions(tree.data ?? [], rootId) : []),
    [tree.data, rootId],
  )

  // Tampilan lama tidak dipakai lagi setelah berpindah task: kesalahan task sebelumnya jangan terbawa
  function openTask(next: string) {
    saveTask.reset()
    setStatus.reset()
    createActivity.reset()
    open(next)
  }

  function closeDrawer() {
    saveTask.reset()
    setStatus.reset()
    createActivity.reset()
    close()
  }

  if (!key) return null

  const loadError = detail.isError
    ? detail.error instanceof ApiError && detail.error.status === 404
      ? 'Task tidak ditemukan, atau Anda tidak punya akses ke proyeknya.'
      : messageOf(detail.error)
    : undefined

  async function save(changes: TaskFieldChanges) {
    if (!task) return
    const { assigneeIds, dates, ...fields } = changes
    await saveTask.mutateAsync({ id: task.id, changes: fields, assigneeIds, dates })
  }

  function changeStatus(next: StatusKey) {
    if (!task) return
    if (isHeld(next)) {
      setHold(next)
      return
    }
    setStatus.mutate(
      { id: task.id, status: statusToApi(next) },
      { onError: (error) => toast.error(messageOf(error)) },
    )
  }

  async function saveHold(values: HoldValues) {
    if (!task) return
    await setStatus.mutateAsync({
      id: task.id,
      status: task.status,
      holdReason: values.holdReason,
      waitingOnUserId: values.waitingOnUserId,
      waitingOnText: values.waitingOnText || undefined,
    })
  }

  async function copyLink() {
    if (!task) return
    const url = `${window.location.origin}${location.pathname}?task=${task.key}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Tautan disalin')
    } catch {
      toast.error('Tautan tidak bisa disalin. Salin dari kolom alamat browser.')
    }
  }

  const saveFieldErrors = saveTask.isError ? fieldErrorsOf(saveTask.error) : {}
  const statusFieldErrors = setStatus.isError ? fieldErrorsOf(setStatus.error) : {}
  const formError =
    saveTask.isError && Object.keys(saveFieldErrors).length === 0
      ? messageOf(saveTask.error)
      : undefined

  return (
    <>
      <TaskDrawer
        open
        onClose={closeDrawer}
        detail={detail.data}
        loading={detail.isPending}
        loadError={loadError}
        onRetry={() => void detail.refetch()}
        people={people}
        knownLabels={knownLabels}
        subProjects={subProjects}
        timeline={{
          items: activities.data?.pages.flatMap((page) => page.items) ?? [],
          loading: activities.isPending,
          error: activities.isError ? messageOf(activities.error) : undefined,
          onRetry: () => void activities.refetch(),
          hasMore: activities.hasNextPage,
          loadingMore: activities.isFetchingNextPage,
          onLoadMore: () => void activities.fetchNextPage(),
        }}
        fieldErrors={{ ...saveFieldErrors, ...statusFieldErrors }}
        formError={formError}
        postError={createActivity.isError ? messageOf(createActivity.error) : undefined}
        onSave={save}
        onChangeStatus={changeStatus}
        onSaveHold={saveHold}
        onPostActivity={(entry) => createActivity.mutateAsync({ taskId: task?.id ?? '', ...entry })}
        onOpenTask={openTask}
        onAddSubtask={() => setAddingSubtask(true)}
        onDelete={() => setDeleting(true)}
        onCopyLink={() => void copyLink()}
      />

      {task && hold ? (
        <HoldReasonDialog
          open
          onClose={() => {
            setHold(null)
            setStatus.reset()
          }}
          status={hold}
          taskLabel={`${task.key} ${task.title}`}
          people={assignable}
          submitting={setStatus.isPending}
          fieldErrors={statusFieldErrors}
          formError={
            setStatus.isError && Object.keys(statusFieldErrors).length === 0
              ? messageOf(setStatus.error)
              : undefined
          }
          onSubmit={(values) =>
            setStatus.mutate(
              {
                id: task.id,
                status: statusToApi(hold),
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
        open={addingSubtask}
        onClose={() => {
          setAddingSubtask(false)
          createSubtask.reset()
        }}
        title="Tambah sub-task"
        description={task ? `Di bawah ${task.key} ${task.title}` : undefined}
        submitLabel="Tambah sub-task"
        projects={[]}
        people={assignable}
        knownLabels={knownLabels}
        submitting={createSubtask.isPending}
        fieldErrors={createSubtask.isError ? fieldErrorsOf(createSubtask.error) : undefined}
        formError={
          createSubtask.isError && Object.keys(fieldErrorsOf(createSubtask.error)).length === 0
            ? messageOf(createSubtask.error)
            : undefined
        }
        onSubmit={(values) => {
          if (!task) return
          createSubtask.mutate(
            { parentId: task.id, ...toTaskPayload(values) },
            {
              onSuccess: (created) => {
                setAddingSubtask(false)
                toast.success(`Sub-task ${created.key} ditambahkan`)
              },
            },
          )
        }}
      />

      <FormDialog
        open={deleting}
        onClose={() => {
          setDeleting(false)
          deleteTask.reset()
        }}
        title={`Hapus ${task?.key ?? ''}?`}
        description={
          task
            ? `"${task.title}" disembunyikan beserta semua sub-tasknya. Datanya tidak hilang dari database.`
            : undefined
        }
        fields={[]}
        submitLabel="Hapus task"
        submitting={deleteTask.isPending}
        formError={deleteTask.isError ? messageOf(deleteTask.error) : undefined}
        onSubmit={() => {
          if (!task) return
          deleteTask.mutate(task.id, {
            onSuccess: () => {
              toast.success(`${task.key} dihapus`)
              setDeleting(false)
              closeDrawer()
            },
          })
        }}
      />
    </>
  )
}
