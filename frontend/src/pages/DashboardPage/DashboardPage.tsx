import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useCreateActivity } from '@/api/activities'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { useDashboard, useTimeline } from '@/api/dashboard'
import { useProjectMembers, useProjectTree } from '@/api/projects'
import { useCreateTask, useLabels, useSetTaskStatus } from '@/api/tasks'
import { useChangeTaskDates, useMoveCandidates, useMoveTask } from '@/api/teamTimeline'
import { useAppContext } from '@/app/context'
import { Avatar } from '@/components/atoms/Avatar'
import { Button } from '@/components/atoms/Button'
import { Banner } from '@/components/molecules/Banner'
import { EmptyState } from '@/components/molecules/EmptyState'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { SummaryCard } from '@/components/molecules/SummaryCard'
import { AddUpdateDialog } from '@/components/organisms/AddUpdateDialog'
import { AttentionPanel } from '@/components/organisms/AttentionPanel'
import { ChangeDatesDialog } from '@/components/organisms/ChangeDatesDialog'
import { GanttChart } from '@/components/organisms/GanttChart'
import { HoldReasonDialog } from '@/components/organisms/HoldReasonDialog'
import { MoveTaskDialog } from '@/components/organisms/MoveTaskDialog'
import { ProjectPickDialog } from '@/components/organisms/ProjectPickDialog'
import { TaskFormDialog } from '@/components/organisms/TaskFormDialog'
import { TodayList } from '@/components/organisms/TodayList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useTaskParam } from '@/hooks/useTaskParam'
import { useToast } from '@/hooks/useToast'
import { greeting, heldHint, isCard, lateHint, weekHint, workingHint } from '@/lib/dashboard'
import { formatDateRange, formatLongDate, formatShortDate } from '@/lib/dates'
import { rangeLabel, ZOOM_LABELS } from '@/lib/gantt'
import { milestoneLabel } from '@/lib/milestones'
import {
  isHeld,
  statusFromApi,
  statusToApi,
  type HeldStatusKey,
  type StatusKey,
} from '@/lib/status'
import { toTaskPayload } from '@/lib/taskForm'
import { projectOptions } from '@/lib/taskGroups'
import type { DashboardCard, TaskRow, TimelineZoom } from '@/types/api'
import './DashboardPage.css'

const spanText = (task: TaskRow): string => {
  if (task.startDate && task.dueDate) return formatDateRange(task.startDate, task.dueDate)
  const single = task.startDate ?? task.dueDate
  return single ? formatShortDate(single) : 'tanpa tanggal'
}

const CARD_LABELS: Record<DashboardCard, string> = {
  terlambat: 'Terlambat',
  minggu: 'Jatuh tempo minggu ini',
  dikerjakan: 'Sedang dikerjakan',
  tertahan: 'Tertahan',
}

/**
 * Dashboard pribadi (mockup 02): sapaan, empat kartu ringkasan yang menyaring daftar "Hari Ini", daftar Hari Ini
 * dengan ubah status dan "Tambah update" langsung dari baris, "Perlu perhatian", dan Timeline saya dengan beban kerja.
 * Semua angka dan pengelompokan datang dari server (pedoman E6); halaman ini hanya menampilkan.
 *
 * Di alamat /dashboard/:userId halaman yang sama dipakai supervisor untuk melihat dashboard anggota timnya (mockup 06b):
 * ada banner, status hanya tampil, dan aksi baris diganti "Ubah tanggal" dan "Pindahkan ke…". Server yang memutuskan
 * siapa boleh (selain supervisor tim itu: 404).
 */
export function DashboardPage() {
  const { me } = useAppContext()
  const toast = useToast()
  const navigate = useNavigate()
  const { userId } = useParams()
  const [params, setParams] = useSearchParams()
  const taskParam = useTaskParam()
  useDocumentTitle('Dashboard')

  const rawCard = params.get('kartu')
  const card = isCard(rawCard) ? rawCard : null
  const [zoom, setZoom] = useState<TimelineZoom>('day')
  const dashboard = useDashboard(card, userId)
  const timeline = useTimeline(zoom, userId, !userId)
  const setStatus = useSetTaskStatus()
  const createActivity = useCreateActivity()
  const createTask = useCreateTask()
  const tree = useProjectTree()
  const [moving, setMoving] = useState<TaskRow | null>(null)
  const [rescheduling, setRescheduling] = useState<TaskRow | null>(null)
  const candidates = useMoveCandidates(moving?.id)
  const move = useMoveTask()
  const changeDates = useChangeTaskDates()

  const [hold, setHold] = useState<{ task: TaskRow; status: HeldStatusKey } | null>(null)
  const [updateFor, setUpdateFor] = useState<TaskRow | null>(null)
  const [picking, setPicking] = useState(false)
  const [newTaskRoot, setNewTaskRoot] = useState<string | null>(null)

  // Anggota dan label proyek yang sedang dipakai dialog (task tertahan, atau task baru)
  const holdMembers = useProjectMembers(hold?.task.projectId)
  const newMembers = useProjectMembers(newTaskRoot ?? undefined)
  const newLabels = useLabels(newTaskRoot ?? undefined)
  const holdPeople = useMemo(
    () =>
      (holdMembers.data ?? [])
        .filter((m) => m.role !== 'Tamu')
        .map((m) => ({ id: m.userId, name: m.displayName })),
    [holdMembers.data],
  )
  const newPeople = useMemo(
    () =>
      (newMembers.data ?? [])
        .filter((m) => m.role !== 'Tamu')
        .map((m) => ({ id: m.userId, name: m.displayName })),
    [newMembers.data],
  )

  if (dashboard.isPending) return <p role="status">Memuat dashboard…</p>
  if (dashboard.isError) {
    return (
      <EmptyState
        title="Dashboard tidak bisa dimuat"
        description={messageOf(dashboard.error)}
        action={<Button onClick={() => void dashboard.refetch()}>Coba lagi</Button>}
      />
    )
  }

  const data = dashboard.data
  const { summary } = data

  function pickCard(next: DashboardCard) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        if (copy.get('kartu') === next) copy.delete('kartu')
        else copy.set('kartu', next)
        return copy
      },
      { replace: true },
    )
  }

  function clearCard() {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        copy.delete('kartu')
        return copy
      },
      { replace: true },
    )
  }

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

  function startNewTask() {
    const only = data.editableProjects[0]
    if (data.editableProjects.length === 1 && only) setNewTaskRoot(only.id)
    else setPicking(true)
  }

  const timelineData = timeline.data
  const newRootName = data.editableProjects.find((p) => p.id === newTaskRoot)?.name ?? ''
  const viewing = data.viewing

  return (
    <div className="ar-dashboard">
      {viewing ? (
        <div className="ar-dashboard-banner">
          <Banner
            kind="viewing"
            action="Kembali ke Timeline Tim"
            onAction={() => void navigate('/timeline-tim')}
          >
            Melihat dashboard: <b>{viewing.name}</b>
          </Banner>
        </div>
      ) : null}

      <div className="ar-dashboard-head">
        {viewing ? (
          <div className="ar-dashboard-who">
            <Avatar name={viewing.name} size={40} />
            <div>
              <div className="ar-dashboard-date">{formatLongDate(data.today)}</div>
              <h1 className="ar-dashboard-title">Dashboard {viewing.name}</h1>
            </div>
          </div>
        ) : (
          <div>
            <div className="ar-dashboard-date">{formatLongDate(data.today)}</div>
            <h1 className="ar-dashboard-title">{greeting(data.dayPart, me.displayName)}</h1>
          </div>
        )}
        {viewing ? (
          <p className="ar-dashboard-hint">
            Anda bisa memindahkan task dan mengubah tanggal dari sini.
          </p>
        ) : data.editableProjects.length > 0 ? (
          <Button variant="primary" icon="plus" onClick={startNewTask}>
            Tambah task
          </Button>
        ) : null}
      </div>

      <div
        className="ar-dashboard-cards"
        role="group"
        aria-label={viewing ? `Ringkasan task ${viewing.name}` : 'Ringkasan task saya'}
      >
        <SummaryCard
          label={CARD_LABELS.terlambat}
          value={summary.late}
          icon="calendar"
          tone={summary.late > 0 ? 'danger' : undefined}
          hint={lateHint(summary)}
          active={card === 'terlambat'}
          onClick={() => pickCard('terlambat')}
        />
        <SummaryCard
          label={CARD_LABELS.minggu}
          value={summary.dueThisWeek}
          icon="calendar"
          hint={weekHint(summary.weekEnd)}
          active={card === 'minggu'}
          onClick={() => pickCard('minggu')}
        />
        <SummaryCard
          label={CARD_LABELS.dikerjakan}
          value={summary.inProgress}
          icon="status-progress"
          hint={workingHint(summary.inProgressProjects)}
          active={card === 'dikerjakan'}
          onClick={() => pickCard('dikerjakan')}
        />
        <SummaryCard
          label={CARD_LABELS.tertahan}
          value={summary.held}
          icon="status-hold"
          tone="held"
          hint={heldHint(summary)}
          active={card === 'tertahan'}
          onClick={() => pickCard('tertahan')}
        />
      </div>

      <div className="ar-dashboard-row">
        <TodayList
          groups={data.groups}
          today={data.today}
          cardLabel={card ? CARD_LABELS[card] : undefined}
          onClearCard={card ? clearCard : undefined}
          title={viewing ? `Hari Ini — ${viewing.name}` : undefined}
          onOpenTask={(task) => taskParam.open(task.key)}
          onChangeStatus={viewing ? undefined : changeStatus}
          onAddUpdate={
            viewing
              ? undefined
              : (task) => {
                  createActivity.reset()
                  setUpdateFor(task)
                }
          }
          renderActions={
            viewing
              ? (task) => (
                  <span className="ar-dashboard-rowactions">
                    <Button
                      size="sm"
                      icon="calendar"
                      aria-label={`Ubah tanggal ${task.key}`}
                      onClick={() => {
                        changeDates.reset()
                        setRescheduling(task)
                      }}
                    >
                      Ubah tanggal
                    </Button>
                    <Button
                      size="sm"
                      icon="move"
                      aria-label={`Pindahkan ${task.key} ke anggota lain`}
                      onClick={() => {
                        move.reset()
                        setMoving(task)
                      }}
                    >
                      Pindahkan ke…
                    </Button>
                  </span>
                )
              : undefined
          }
          empty={
            card ? (
              <EmptyState
                icon="search"
                title="Tidak ada task pada kartu ini"
                description="Hapus saringan untuk melihat semua task Hari Ini."
                action={<Button onClick={clearCard}>Hapus saringan</Button>}
              />
            ) : (
              <EmptyState
                icon="check"
                title="Tidak ada task untuk hari ini"
                description={
                  viewing
                    ? `Task ${viewing.name} yang sedang berjalan akan muncul di sini.`
                    : 'Task yang menjadi tanggung jawab Anda dan sedang berjalan akan muncul di sini.'
                }
              />
            )
          }
        />
        {viewing ? null : (
          <AttentionPanel
            items={data.attention}
            today={data.today}
            onOpenTask={(key) => taskParam.open(key)}
            onSeeAll={() => void navigate('/notifikasi')}
          />
        )}
      </div>

      {viewing ? null : (
        <section className="ar-card ar-dashboard-timeline" aria-label="Timeline saya">
          <div className="ar-dashboard-timelinehead">
            <div className="ar-dashboard-timelinetitle">
              <h2>Timeline saya</h2>
              {timelineData ? (
                <span>Semua proyek · {rangeLabel(timelineData.start, timelineData.dayCount)}</span>
              ) : null}
            </div>
            <SegmentedControl
              label="Skala waktu"
              value={zoom}
              onChange={setZoom}
              options={(Object.keys(ZOOM_LABELS) as TimelineZoom[]).map((value) => ({
                value,
                label: ZOOM_LABELS[value],
              }))}
            />
          </div>
          {timeline.isError ? (
            <div className="ar-dashboard-note">
              <EmptyState
                title="Timeline tidak bisa dimuat"
                description={messageOf(timeline.error)}
                action={<Button onClick={() => void timeline.refetch()}>Coba lagi</Button>}
              />
            </div>
          ) : timelineData ? (
            <GanttChart
              groups={timelineData.groups.map((group) => ({
                id: group.projectId,
                label: group.name,
                milestones: group.milestones.map((m) => ({
                  id: m.id,
                  label: milestoneLabel(m, Number(data.today.slice(0, 4))),
                  date: m.date,
                  done: m.isDone,
                })),
                tasks: group.tasks.map((task) => ({
                  id: task.id,
                  key: task.key,
                  title: task.title,
                  status: statusFromApi(task.status),
                  start: task.startDate,
                  due: task.dueDate,
                  overdue: task.isOverdue,
                })),
              }))}
              rangeStart={timelineData.start}
              dayCount={timelineData.dayCount}
              zoom={timelineData.zoom}
              today={timelineData.today}
              workload={timelineData.workload}
              workloadLabel="Beban kerja saya"
              onOpenTask={(key) => taskParam.open(key)}
              empty={
                <EmptyState
                  icon="timeline"
                  title="Belum ada task di rentang ini"
                  description="Task dengan tanggal yang menjadi tanggung jawab Anda akan tampil di sini."
                />
              }
            />
          ) : (
            <p role="status" className="ar-dashboard-note">
              Memuat timeline…
            </p>
          )}
        </section>
      )}

      {viewing && moving ? (
        <MoveTaskDialog
          open
          onClose={() => setMoving(null)}
          taskLabel={`${moving.key} ${moving.title}`}
          context={`${spanText(moving)} · saat ini: ${viewing.name}`}
          from={{ id: viewing.id, name: viewing.name }}
          candidates={candidates.data}
          loading={candidates.isPending}
          loadError={candidates.isError ? messageOf(candidates.error) : undefined}
          submitting={move.isPending}
          error={move.isError ? messageOf(move.error) : undefined}
          onSubmit={({ toUserId, notify }) =>
            move.mutate(
              { taskId: moving.id, fromUserId: viewing.id, toUserId, notify },
              {
                onSuccess: (row) => {
                  toast.success(
                    `${moving.key} dipindahkan ke ${row.assignees.map((a) => a.name).join(', ')}`,
                  )
                  setMoving(null)
                },
              },
            )
          }
        />
      ) : null}

      {rescheduling ? (
        <ChangeDatesDialog
          open
          onClose={() => setRescheduling(null)}
          taskLabel={`${rescheduling.key} ${rescheduling.title}`}
          initial={{ start: rescheduling.startDate ?? '', end: rescheduling.dueDate ?? '' }}
          submitting={changeDates.isPending}
          error={changeDates.isError ? messageOf(changeDates.error) : undefined}
          onSubmit={(dates) =>
            changeDates.mutate(
              { taskId: rescheduling.id, ...dates },
              {
                onSuccess: () => {
                  toast.success(`Tanggal ${rescheduling.key} diubah`)
                  setRescheduling(null)
                },
              },
            )
          }
        />
      ) : null}

      {hold ? (
        <HoldReasonDialog
          open
          onClose={() => {
            setHold(null)
            setStatus.reset()
          }}
          status={hold.status}
          taskLabel={`${hold.task.key} ${hold.task.title}`}
          people={holdPeople}
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

      <AddUpdateDialog
        open={updateFor !== null}
        onClose={() => setUpdateFor(null)}
        taskLabel={updateFor ? `${updateFor.key} ${updateFor.title}` : ''}
        submitting={createActivity.isPending}
        error={createActivity.isError ? messageOf(createActivity.error) : undefined}
        onSubmit={(body) => {
          if (!updateFor) return
          createActivity.mutate(
            { taskId: updateFor.id, kind: 'Update', body, mentionUserIds: [] },
            {
              onSuccess: () => {
                toast.success(`Update untuk ${updateFor.key} dikirim`)
                setUpdateFor(null)
              },
            },
          )
        }}
      />

      <ProjectPickDialog
        open={picking}
        onClose={() => setPicking(false)}
        projects={data.editableProjects}
        onPick={(id) => {
          setPicking(false)
          setNewTaskRoot(id)
        }}
      />

      <TaskFormDialog
        open={newTaskRoot !== null}
        onClose={() => {
          setNewTaskRoot(null)
          createTask.reset()
        }}
        title="Tambah task"
        description={`Di ${newRootName}. Nomor task dibuat otomatis.`}
        submitLabel="Tambah task"
        initial={newTaskRoot ? { projectId: newTaskRoot } : undefined}
        projects={newTaskRoot ? projectOptions(tree.data ?? [], newTaskRoot) : []}
        people={newPeople}
        knownLabels={(newLabels.data ?? []).map((l) => l.name)}
        submitting={createTask.isPending}
        fieldErrors={createTask.isError ? fieldErrorsOf(createTask.error) : undefined}
        formError={
          createTask.isError && Object.keys(fieldErrorsOf(createTask.error)).length === 0
            ? messageOf(createTask.error)
            : undefined
        }
        onSubmit={(values) =>
          createTask.mutate(
            { projectId: values.projectId, ...toTaskPayload(values) },
            {
              onSuccess: (created) => {
                setNewTaskRoot(null)
                toast.success(`Task ${created.key} ditambahkan`)
              },
            },
          )
        }
      />
    </div>
  )
}
