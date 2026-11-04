import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { messageOf } from '@/api/errors'
import {
  useChangeTaskDates,
  useMoveCandidates,
  useMoveTask,
  useTeamTimeline,
} from '@/api/teamTimeline'
import { useAppContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { EmptyState } from '@/components/molecules/EmptyState'
import { FilterChip } from '@/components/molecules/FilterChip'
import { Popover } from '@/components/molecules/Popover'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { ChangeDatesDialog } from '@/components/organisms/ChangeDatesDialog'
import { Menu } from '@/components/organisms/Menu'
import { MoveTaskDialog } from '@/components/organisms/MoveTaskDialog'
import {
  TeamTimelineGrid,
  type TeamGridPerson,
  type TeamGridTask,
} from '@/components/organisms/TeamTimelineGrid'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useTaskParam } from '@/hooks/useTaskParam'
import { useToast } from '@/hooks/useToast'
import { formatDateRange, formatShortDate } from '@/lib/dates'
import { ZOOM_LABELS } from '@/lib/gantt'
import {
  PRIORITY_NAMES,
  priorityFromApi,
  STATUSES,
  statusFromApi,
  statusToApi,
  WORK_STATUS_NAMES,
} from '@/lib/status'
import { pathLabel, teamLabel } from '@/lib/teamTimeline'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { PriorityName, TimelineZoom, WorkStatusName } from '@/types/api'
import './TimelineTimPage.css'

const ZOOMS = Object.keys(ZOOM_LABELS) as TimelineZoom[]

type Dropdown = 'team' | 'project' | 'status' | 'priority'

const toggled = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

const spanOf = (task: Pick<TeamGridTask, 'start' | 'due'>): string => {
  if (task.start && task.due) return formatDateRange(task.start, task.due)
  const single = task.start ?? task.due
  return single ? formatShortDate(single) : 'tanpa tanggal'
}

/**
 * Timeline Tim untuk supervisor (mockup 06 dan 06a): beban kerja per orang lintas proyek, task per orang yang bisa
 * dibuka, filter, zoom, "Pindahkan ke…" dan "Ubah tanggal" dari baris task. Semua angka datang dari server; hanya
 * supervisor tim itu yang diizinkan server, menu dan halaman ini disembunyikan bagi yang lain.
 */
export function TimelineTimPage() {
  const { me } = useAppContext()
  const toast = useToast()
  const navigate = useNavigate()
  const taskParam = useTaskParam()
  const [params, setParams] = useSearchParams()
  useDocumentTitle('Timeline Tim')

  const teamId = params.get('tim') ?? undefined
  const [zoom, setZoom] = useState<TimelineZoom>('day')
  const [project, setProject] = useState<string | undefined>()
  const [status, setStatus] = useState<WorkStatusName[]>([])
  const [priority, setPriority] = useState<PriorityName[]>([])
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [open, setOpen] = useState<Dropdown | null>(null)
  const [todayKey, setTodayKey] = useState(0)
  const [moving, setMoving] = useState<{ task: TeamGridTask; person: TeamGridPerson } | null>(null)
  const [rescheduling, setRescheduling] = useState<TeamGridTask | null>(null)

  const timeline = useTeamTimeline({ teamId, zoom, project, status, priority, overdueOnly })
  const candidates = useMoveCandidates(moving?.task.id)
  const move = useMoveTask()
  const changeDates = useChangeTaskDates()
  const closeMenu = useCallback(() => setOpen(null), [])

  const people = useMemo<TeamGridPerson[]>(
    () =>
      (timeline.data?.people ?? []).map((person) => ({
        id: person.userId,
        name: person.name,
        counts: person.counts,
        tasks: person.tasks.map((task) => ({
          id: task.id,
          key: task.key,
          title: task.title,
          status: statusFromApi(task.status),
          priority: priorityFromApi(task.priority),
          start: task.startDate,
          due: task.dueDate,
          overdue: task.isOverdue,
          project: pathLabel(task.projectPath),
        })),
      })),
    [timeline.data],
  )

  if (!me.isSupervisor) return <NotFoundPage />
  if (timeline.isPending) return <p role="status">Memuat Timeline Tim…</p>
  if (timeline.isError) {
    return (
      <EmptyState
        title="Timeline Tim tidak bisa dimuat"
        description={messageOf(timeline.error)}
        action={<Button onClick={() => void timeline.refetch()}>Coba lagi</Button>}
      />
    )
  }

  const data = timeline.data
  const otherTeams = data.teams.filter((t) => t.id !== data.teamId)
  const currentTeam = data.teams.find((t) => t.id === data.teamId)
  const projectName = data.projects.find((p) => p.id === project)?.name
  const toggleMenu = (which: Dropdown) => setOpen((current) => (current === which ? null : which))
  const single = <T extends string>(list: readonly T[], text: (v: T) => string) =>
    list.length === 1 && list[0] !== undefined ? text(list[0]) : undefined

  function pickTeam(id: string) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current)
        copy.set('tim', id)
        return copy
      },
      { replace: true },
    )
    setExpanded(new Set())
  }

  function dropdown(
    which: Dropdown,
    label: string,
    selected: number,
    value: string | undefined,
    menu: Parameters<typeof Menu>[0],
  ) {
    return (
      <Popover
        open={open === which}
        onClose={closeMenu}
        anchor={
          <FilterChip
            label={label}
            value={value}
            count={selected > 1 ? selected : undefined}
            active={selected > 0}
            aria-expanded={open === which}
            onClick={() => toggleMenu(which)}
          />
        }
      >
        <Menu {...menu} autoFocus onClose={closeMenu} />
      </Popover>
    )
  }

  return (
    <div className="ar-tt">
      <div className="ar-tt-head">
        <h1 className="ar-tt-title">Timeline Tim</h1>
        <Popover
          open={open === 'team'}
          onClose={closeMenu}
          anchor={
            <button
              type="button"
              className="ar-tt-team"
              aria-haspopup="listbox"
              aria-expanded={open === 'team'}
              onClick={() => data.teams.length > 1 && toggleMenu('team')}
            >
              <Icon name="users" size={16} />
              {currentTeam ? teamLabel(currentTeam.name, currentTeam.memberCount) : data.teamName}
              {data.teams.length > 1 ? <Icon name="chevron-down" size={14} /> : null}
            </button>
          }
        >
          <Menu
            title="Pilih tim"
            width={240}
            autoFocus
            onClose={closeMenu}
            items={data.teams.map((t) => ({
              icon: 'users' as const,
              label: t.name,
              meta: `${t.memberCount} orang`,
              selected: t.id === data.teamId,
            }))}
            onSelect={(_item, index) => {
              const team = data.teams[index]
              if (team) pickTeam(team.id)
              closeMenu()
            }}
          />
        </Popover>
        {otherTeams.length > 0 ? (
          <span className="ar-tt-also">
            Anda juga memegang: {otherTeams.map((t) => t.name).join(', ')}
          </span>
        ) : null}
        <span className="ar-tt-spacer" />
        <Button size="sm" icon="calendar" onClick={() => setTodayKey((k) => k + 1)}>
          Hari ini
        </Button>
        <SegmentedControl
          label="Skala waktu"
          value={zoom}
          onChange={setZoom}
          options={ZOOMS.map((value) => ({ value, label: ZOOM_LABELS[value] }))}
        />
      </div>

      <div className="ar-tt-filters" role="search" aria-label="Filter Timeline Tim">
        {dropdown('project', 'Proyek', project ? 1 : 0, projectName ?? 'Semua', {
          title: 'Filter proyek',
          width: 240,
          items: [
            { label: 'Semua proyek', selected: !project },
            ...data.projects.map((p) => ({ label: p.name, selected: p.id === project })),
          ],
          onSelect: (_item, index) => {
            setProject(index === 0 ? undefined : data.projects[index - 1]?.id)
            closeMenu()
          },
        })}
        {dropdown(
          'status',
          'Status',
          status.length,
          single(status, (v) => STATUSES.find((s) => s.key === statusFromApi(v))?.label ?? v),
          {
            title: 'Filter status',
            width: 200,
            items: WORK_STATUS_NAMES.map((name) => ({
              status: statusFromApi(name),
              selected: status.includes(name),
            })),
            onSelect: (item) => {
              const key = item.status
              if (key) setStatus((list) => toggled(list, statusToApi(key)))
            },
          },
        )}
        {dropdown(
          'priority',
          'Prioritas',
          priority.length,
          single(priority, (v) => v),
          {
            title: 'Filter prioritas',
            width: 180,
            items: PRIORITY_NAMES.map((name) => ({
              label: name,
              selected: priority.includes(name),
            })),
            onSelect: (_item, index) => {
              const name = PRIORITY_NAMES[index]
              if (name) setPriority((list) => toggled(list, name))
            },
          },
        )}
        <FilterChip
          label="Hanya yang terlambat"
          toggle
          active={overdueOnly}
          onClick={() => setOverdueOnly((on) => !on)}
        />
        <span className="ar-tt-spacer" />
        <span className="ar-tt-legend">
          Task aktif per hari: 0
          {[0, 1, 2, 3, 4, 5].map((step) => (
            <span key={step} className={`ar-heat ar-heat-${step}`} />
          ))}
          5+
        </span>
      </div>

      <section className="ar-card ar-tt-card" aria-label="Beban kerja tim">
        <TeamTimelineGrid
          people={people}
          rangeStart={data.start}
          dayCount={data.dayCount}
          zoom={data.zoom}
          today={data.today}
          expanded={expanded}
          scrollToTodayKey={todayKey}
          onToggle={(id) =>
            setExpanded((set) => {
              const next = new Set(set)
              if (!next.delete(id)) next.add(id)
              return next
            })
          }
          onOpenPerson={(person) => void navigate(`/dashboard/${person.id}`)}
          onOpenTask={(key) => taskParam.open(key)}
          onMoveTask={(task, person) => {
            move.reset()
            setMoving({ task, person })
          }}
          onChangeDates={(task) => {
            changeDates.reset()
            setRescheduling(task)
          }}
          empty={
            <EmptyState
              icon="users"
              title="Belum ada anggota di tim ini"
              description="Tambahkan anggota di halaman Tim untuk melihat beban kerja mereka."
            />
          }
        />
      </section>

      {moving ? (
        <MoveTaskDialog
          open
          onClose={() => setMoving(null)}
          taskLabel={`${moving.task.key} ${moving.task.title}`}
          context={`${spanOf(moving.task)} · saat ini: ${moving.person.name}`}
          from={{ id: moving.person.id, name: moving.person.name }}
          candidates={candidates.data}
          loading={candidates.isPending}
          loadError={candidates.isError ? messageOf(candidates.error) : undefined}
          submitting={move.isPending}
          error={move.isError ? messageOf(move.error) : undefined}
          onSubmit={({ toUserId, notify }) =>
            move.mutate(
              { taskId: moving.task.id, fromUserId: moving.person.id, toUserId, notify },
              {
                onSuccess: (row) => {
                  toast.success(
                    `${moving.task.key} dipindahkan ke ${row.assignees.map((a) => a.name).join(', ')}`,
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
          initial={{ start: rescheduling.start ?? '', end: rescheduling.due ?? '' }}
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
    </div>
  )
}
