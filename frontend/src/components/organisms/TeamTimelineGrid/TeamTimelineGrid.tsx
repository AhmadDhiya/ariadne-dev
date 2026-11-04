import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon } from '@/components/atoms/Icon'
import { IconButton } from '@/components/atoms/IconButton'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { GanttBar } from '@/components/molecules/GanttBar'
import { GanttTrack } from '@/components/molecules/GanttTrack'
import { TodayMarker } from '@/components/molecules/TodayMarker'
import { WorkloadRow } from '@/components/molecules/WorkloadRow'
import { cx } from '@/lib/cx'
import {
  barGeometry,
  DAY_WIDTH,
  dayIndex,
  ganttDays,
  headerSegments,
  TODAY_SCROLL_OFFSET,
} from '@/lib/gantt'
import type { PriorityKey, StatusKey } from '@/lib/status'
import { activeToday, activeTodayText, HEAVY_TODAY } from '@/lib/teamTimeline'
import type { TimelineZoom } from '@/types/api'
import './TeamTimelineGrid.css'

export interface TeamGridTask {
  id: string
  /** ID tampilan, mis. "SEN-150". */
  key: string
  title: string
  status: StatusKey
  priority: PriorityKey
  /** "YYYY-MM-DD" atau kosong. */
  start: string | null
  due: string | null
  /** Dihitung di server. */
  overdue: boolean
  /** Jalur proyek, mis. "Sentul / Testing Oktober". */
  project: string
}

export interface TeamGridPerson {
  id: string
  name: string
  /** Task aktif per hari lintas proyek, sejajar dengan kolom grafik (dari server). */
  counts: readonly number[]
  tasks: readonly TeamGridTask[]
}

export interface TeamTimelineGridProps {
  people: readonly TeamGridPerson[]
  rangeStart: string
  dayCount: number
  zoom: TimelineZoom
  /** Hari ini menurut server ("YYYY-MM-DD"). */
  today: string
  /** Id orang yang barisnya terbuka (task-nya tampil). */
  expanded: ReadonlySet<string>
  onToggle: (personId: string) => void
  onOpenPerson: (person: TeamGridPerson) => void
  onOpenTask: (key: string) => void
  /** Tombol "Pindahkan ke anggota lain" di baris task. */
  onMoveTask: (task: TeamGridTask, person: TeamGridPerson) => void
  /** Tombol "Ubah tanggal" di baris task. */
  onChangeDates: (task: TeamGridTask, person: TeamGridPerson) => void
  /** Berubah (angka bertambah) = gulir agar hari ini terlihat. */
  scrollToTodayKey?: number
  /** Ditampilkan bila tidak ada anggota sama sekali. */
  empty: ReactNode
}

const LEFT = 304
const HEADER = 44
const PERSON_ROW = 40
const TASK_ROW = 36

type Row =
  | { kind: 'person'; person: TeamGridPerson }
  | { kind: 'task'; person: TeamGridPerson; task: TeamGridTask }
  | { kind: 'none'; person: TeamGridPerson }

/**
 * Timeline Tim (mockup 06): satu baris per anggota dengan heatmap beban kerjanya (lintas proyek), yang bisa dibuka untuk
 * melihat task-nya sebagai bar. Baris task punya tombol "Pindahkan ke anggota lain" dan "Ubah tanggal". Angka beban
 * dan "aktif hari ini" datang dari server; komponen ini hanya menggambar.
 */
export function TeamTimelineGrid({
  people,
  rangeStart,
  dayCount,
  zoom,
  today,
  expanded,
  onToggle,
  onOpenPerson,
  onOpenTask,
  onMoveTask,
  onChangeDates,
  scrollToTodayKey = 0,
  empty,
}: TeamTimelineGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayWidth = DAY_WIDTH[zoom]
  const days = useMemo(() => ganttDays(rangeStart, dayCount), [rangeStart, dayCount])
  const segments = useMemo(() => headerSegments(days, zoom), [days, zoom])
  const todayIndex = dayIndex(rangeStart, today)
  const weekends = days.flatMap((d, i) => (d.weekend ? [i] : []))
  const hasPeople = people.length > 0

  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    box.scrollLeft = Math.max(0, (todayIndex - TODAY_SCROLL_OFFSET[zoom]) * dayWidth)
  }, [hasPeople, zoom, rangeStart, todayIndex, dayWidth, scrollToTodayKey])

  if (!hasPeople) return <div className="ar-ttg-empty">{empty}</div>

  const rows: Row[] = people.flatMap((person) => {
    const head: Row = { kind: 'person', person }
    if (!expanded.has(person.id)) return [head]
    if (person.tasks.length === 0) return [head, { kind: 'none', person } satisfies Row]
    return [head, ...person.tasks.map((task): Row => ({ kind: 'task', person, task }))]
  })
  const height = rows.reduce((sum, row) => sum + (row.kind === 'person' ? PERSON_ROW : TASK_ROW), 0)

  return (
    <div className="ar-ttg">
      <div className="ar-ttg-left" style={{ width: LEFT }}>
        <div className="ar-ttg-lefthead" style={{ height: HEADER }}>
          Anggota · task
        </div>
        {rows.map((row) => {
          if (row.kind === 'person') {
            const { person } = row
            const open = expanded.has(person.id)
            const count = activeToday(person.counts, rangeStart, today)
            return (
              <div key={`p-${person.id}`} className="ar-ttg-person" style={{ height: PERSON_ROW }}>
                <button
                  type="button"
                  className={cx('ar-ttg-caret', open && 'is-open')}
                  aria-expanded={open}
                  aria-label={`Buka task ${person.name}`}
                  onClick={() => onToggle(person.id)}
                >
                  <Icon name="chevron-down" size={14} />
                </button>
                <Avatar name={person.name} size={24} />
                <button type="button" className="ar-ttg-name" onClick={() => onOpenPerson(person)}>
                  {person.name}
                </button>
                <span className={cx('ar-ttg-count', count >= HEAVY_TODAY && 'is-heavy')}>
                  {activeTodayText(count)}
                </span>
              </div>
            )
          }
          if (row.kind === 'none') {
            return (
              <div key={`n-${row.person.id}`} className="ar-ttg-none" style={{ height: TASK_ROW }}>
                Tidak ada task di rentang ini
              </div>
            )
          }
          const { task, person } = row
          return (
            <div
              key={`t-${person.id}-${task.id}`}
              className="ar-ttg-task"
              style={{ height: TASK_ROW }}
            >
              <PriorityIcon priority={task.priority} size={14} />
              <span className="ar-ttg-taskmain">
                <button
                  type="button"
                  className="ar-ttg-tasktitle"
                  title={task.title}
                  onClick={() => onOpenTask(task.key)}
                >
                  {task.title}
                </button>
                <span className="ar-ttg-taskpath">
                  {task.key} · {task.project}
                </span>
              </span>
              <span className="ar-ttg-actions">
                <IconButton
                  icon="move"
                  size="sm"
                  label={`Pindahkan ${task.key} ke anggota lain`}
                  onClick={() => onMoveTask(task, person)}
                />
                <IconButton
                  icon="calendar"
                  size="sm"
                  label={`Ubah tanggal ${task.key}`}
                  onClick={() => onChangeDates(task, person)}
                />
              </span>
            </div>
          )
        })}
      </div>

      <div
        ref={scrollRef}
        className="ar-ttg-right"
        role="region"
        aria-label="Grafik timeline tim"
        tabIndex={0}
      >
        <div className="ar-ttg-canvas" style={{ width: dayCount * dayWidth }}>
          <div className="ar-ttg-header" style={{ height: HEADER }}>
            {segments.map((segment) => {
              const day = days[segment.from]
              const isToday = zoom === 'day' && segment.from === todayIndex
              return (
                <div
                  key={segment.from}
                  className={cx(
                    'ar-ttg-col',
                    zoom !== 'day' && 'is-wide',
                    day?.weekend && zoom === 'day' && 'is-weekend',
                    isToday && 'is-today',
                  )}
                  style={{ width: segment.span * dayWidth }}
                >
                  {zoom === 'day' ? <span>{day?.letter}</span> : null}
                  <span className="ar-ttg-colnum">{segment.label}</span>
                </div>
              )
            })}
          </div>
          {rows.map((row) => {
            if (row.kind === 'person') {
              return (
                <div
                  key={`p-${row.person.id}`}
                  className="ar-ttg-line"
                  style={{ height: PERSON_ROW }}
                >
                  <WorkloadRow
                    counts={[...row.person.counts]}
                    weekends={weekends}
                    dayWidth={dayWidth}
                  />
                </div>
              )
            }
            if (row.kind === 'none') {
              return (
                <div
                  key={`n-${row.person.id}`}
                  className="ar-ttg-line"
                  style={{ height: TASK_ROW }}
                >
                  <GanttTrack days={days} dayWidth={dayWidth} height={TASK_ROW} />
                </div>
              )
            }
            const { task, person } = row
            const geometry = barGeometry(rangeStart, dayCount, task.start, task.due)
            return (
              <div
                key={`t-${person.id}-${task.id}`}
                className="ar-ttg-line"
                style={{ height: TASK_ROW }}
              >
                <GanttTrack days={days} dayWidth={dayWidth} height={TASK_ROW}>
                  {geometry ? (
                    <GanttBar
                      status={task.status}
                      start={geometry.start}
                      span={geometry.span}
                      top={8}
                      overdue={task.overdue}
                      dayWidth={dayWidth}
                    />
                  ) : null}
                </GanttTrack>
              </div>
            )
          })}
          {todayIndex >= 0 && todayIndex < dayCount ? (
            <div className="ar-ttg-today" style={{ top: HEADER, height }}>
              <TodayMarker day={todayIndex} label={false} dayWidth={dayWidth} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
