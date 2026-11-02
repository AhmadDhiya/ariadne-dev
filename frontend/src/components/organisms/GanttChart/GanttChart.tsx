import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon } from '@/components/atoms/Icon'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import { GanttBar } from '@/components/molecules/GanttBar'
import { GanttTrack } from '@/components/molecules/GanttTrack'
import { Milestone } from '@/components/molecules/Milestone'
import { TodayMarker } from '@/components/molecules/TodayMarker'
import { WorkloadRow } from '@/components/molecules/WorkloadRow'
import { cx } from '@/lib/cx'
import {
  barGeometry,
  DAY_WIDTH,
  dayIndex,
  ganttDays,
  headerSegments,
  layoutRows,
  TODAY_SCROLL_OFFSET,
} from '@/lib/gantt'
import type { PriorityKey, StatusKey } from '@/lib/status'
import type { TimelineZoom } from '@/types/api'
import './GanttChart.css'

export interface GanttChartTask {
  id: string
  /** ID tampilan, mis. "SEN-115". */
  key: string
  title: string
  status: StatusKey
  /** "YYYY-MM-DD" atau kosong. */
  start: string | null
  due: string | null
  /** Dihitung di server. */
  overdue: boolean
  /** Nama PIC: tampil sebagai avatar di daftar kiri dan sebagai label di kanan bar (bila `barLabels`). */
  assignees?: string[]
  priority?: PriorityKey
  /** Sub-task: menjorok di daftar kiri. */
  subtask?: boolean
}

export interface GanttChartMilestone {
  id: string
  /** Mis. "UAT SLMS · 5 Okt". */
  label: string
  /** "YYYY-MM-DD" */
  date: string
  done: boolean
}

export interface GanttChartGroup {
  id: string
  label: string
  tasks: GanttChartTask[]
  /** Milestone yang digambar di baris grup ini. */
  milestones?: GanttChartMilestone[]
}

export interface GanttChartPerson {
  id: string
  name: string
  /** Jumlah task aktif per hari, sejajar dengan kolom grafik. */
  counts: readonly number[]
}

export interface GanttChartProps {
  groups: readonly GanttChartGroup[]
  /** Hari pertama grafik ("YYYY-MM-DD") dan jumlah harinya. */
  rangeStart: string
  dayCount: number
  zoom: TimelineZoom
  /** Hari ini menurut server ("YYYY-MM-DD"): letak garis "Hari ini". */
  today: string
  /** Jumlah task aktif per hari (satu baris, mis. "Beban kerja saya"), dari server. */
  workload?: readonly number[]
  /** Nama baris beban kerja tunggal. */
  workloadLabel?: string
  /** Beban kerja per orang (Gantt proyek): menggantikan baris tunggal. */
  people?: readonly GanttChartPerson[]
  onOpenTask?: (key: string) => void
  /** Ditampilkan menggantikan grafik bila tidak ada task di rentang ini. */
  empty: ReactNode
  /** Lebar daftar kiri (px): 300 untuk Timeline saya, 360 untuk Gantt proyek. */
  leftWidth?: number
  /** Pita abu-abu di belakang tiap baris grup, dan label PIC di kanan bar (Gantt proyek). */
  detailed?: boolean
  /** Berubah (angka bertambah) = gulir agar hari ini terlihat (tombol "Hari ini"). */
  scrollToTodayKey?: number
}

const GROUP_ROW = 32
const TASK_ROW = 36
const HEADER = 44
const PEOPLE_HEADER = 36

/**
 * Grafik Gantt (mockup 02 dan 04): daftar task di kiri, grid hari dengan bar, milestone, dan garis "Hari ini" di kanan,
 * dan beban kerja di bawah (satu baris untuk diri sendiri, atau satu baris per orang). Bagian kanan bisa digulir ke samping;
 * saat dibuka dan saat zoom berganti, grafik digulir supaya hari ini terlihat. Posisi bar dan angka beban dihitung di server
 * dan `lib/gantt`; komponen ini hanya menggambar.
 */
export function GanttChart({
  groups,
  rangeStart,
  dayCount,
  zoom,
  today,
  workload = [],
  workloadLabel = 'Beban kerja saya',
  people,
  onOpenTask,
  empty,
  leftWidth = 300,
  detailed = false,
  scrollToTodayKey = 0,
}: GanttChartProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayWidth = DAY_WIDTH[zoom]
  const days = useMemo(() => ganttDays(rangeStart, dayCount), [rangeStart, dayCount])
  const segments = useMemo(() => headerSegments(days, zoom), [days, zoom])
  const todayIndex = dayIndex(rangeStart, today)
  const weekends = days.flatMap((d, i) => (d.weekend ? [i] : []))
  const hasGroups = groups.length > 0

  // Gulir ke hari ini saat dibuka, saat zoom atau rentang berganti, dan saat tombol "Hari ini" ditekan
  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    box.scrollLeft = Math.max(0, (todayIndex - TODAY_SCROLL_OFFSET[zoom]) * dayWidth)
  }, [hasGroups, zoom, rangeStart, todayIndex, dayWidth, scrollToTodayKey])

  if (!hasGroups) return <div className="ar-gantt-empty">{empty}</div>

  // Baris yang tampil, dengan letak vertikal masing-masing (bar mengikuti baris tasknya)
  const { rows, height: chartHeight } = layoutRows<GanttChartGroup, GanttChartTask>(
    groups,
    collapsed,
    GROUP_ROW,
    TASK_ROW,
  )
  const inRange = (date: string) => {
    const i = dayIndex(rangeStart, date)
    return i >= 0 && i < dayCount ? i : null
  }

  return (
    <div className="ar-gantt">
      <div className="ar-gantt-left" style={{ width: leftWidth }}>
        <div
          className={cx('ar-gantt-lefthead', detailed && 'is-detailed')}
          style={{ height: HEADER }}
        >
          <span className="ar-gantt-lefthead-title">Task</span>
          {detailed ? <span>PIC</span> : null}
        </div>
        {rows.map((row) =>
          row.kind === 'group' ? (
            <button
              key={`g-${row.group.id}`}
              type="button"
              className={cx('ar-gantt-group', detailed && 'is-detailed')}
              style={{ height: GROUP_ROW }}
              aria-expanded={!collapsed.has(row.group.id)}
              onClick={() =>
                setCollapsed((set) => {
                  const next = new Set(set)
                  if (!next.delete(row.group.id)) next.add(row.group.id)
                  return next
                })
              }
            >
              <Icon
                name="chevron-down"
                size={14}
                className={cx('ar-gantt-chevron', collapsed.has(row.group.id) && 'is-collapsed')}
              />
              {row.group.label}
            </button>
          ) : (
            row.task && (
              <div
                key={row.task.id}
                className={cx(
                  'ar-gantt-task',
                  detailed && 'is-detailed',
                  row.task.subtask && 'is-sub',
                )}
                style={{ height: TASK_ROW }}
              >
                <span className="ar-id">{row.task.key}</span>
                {onOpenTask ? (
                  <button
                    type="button"
                    className="ar-gantt-title"
                    title={row.task.title}
                    onClick={() => onOpenTask(row.task?.key ?? '')}
                  >
                    {row.task.title}
                  </button>
                ) : (
                  <span className="ar-gantt-title">{row.task.title}</span>
                )}
                {detailed && row.task.assignees && row.task.assignees.length > 0 ? (
                  <AvatarStack names={row.task.assignees} size={20} />
                ) : null}
              </div>
            )
          ),
        )}
        {people ? (
          <div className="ar-gantt-people ar-gantt-peoplecol">
            <div className="ar-gantt-peoplehead" style={{ height: PEOPLE_HEADER }}>
              Beban kerja per orang <span>task aktif per hari</span>
            </div>
            {people.map((person) => (
              <div key={person.id} className="ar-gantt-person" style={{ height: TASK_ROW }}>
                <Avatar name={person.name} size={20} />
                {person.name}
              </div>
            ))}
          </div>
        ) : (
          <div className="ar-gantt-leftfoot" style={{ height: HEADER }}>
            {workloadLabel}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="ar-gantt-right"
        role="region"
        aria-label="Grafik timeline"
        tabIndex={0}
      >
        <div style={{ width: dayCount * dayWidth }}>
          <div className="ar-gantt-header" style={{ height: HEADER }}>
            {segments.map((segment) => {
              const day = days[segment.from]
              const isToday = zoom === 'day' && segment.from === todayIndex
              return (
                <div
                  key={segment.from}
                  className={cx(
                    'ar-gantt-col',
                    zoom !== 'day' && 'is-wide',
                    day?.weekend && zoom === 'day' && 'is-weekend',
                    isToday && 'is-today',
                  )}
                  style={{ width: segment.span * dayWidth }}
                >
                  {zoom === 'day' ? <span>{day?.letter}</span> : null}
                  <span className="ar-gantt-colnum">{segment.label}</span>
                </div>
              )
            })}
          </div>
          <GanttTrack days={days} dayWidth={dayWidth} height={chartHeight}>
            {detailed
              ? rows.map((row) =>
                  row.kind === 'group' ? (
                    <div
                      key={`b-${row.group.id}`}
                      className="ar-gantt-band"
                      style={{ top: row.top, height: GROUP_ROW }}
                    />
                  ) : null,
                )
              : null}
            {rows.map((row) => {
              if (row.kind !== 'task' || !row.task) return null
              const geometry = barGeometry(rangeStart, dayCount, row.task.start, row.task.due)
              return geometry ? (
                <GanttBar
                  key={row.task.id}
                  status={row.task.status}
                  start={geometry.start}
                  span={geometry.span}
                  top={row.top + 8}
                  overdue={row.task.overdue}
                  label={detailed ? row.task.assignees?.join(', ') : undefined}
                  priority={detailed ? row.task.priority : undefined}
                  dayWidth={dayWidth}
                />
              ) : null
            })}
            {rows.flatMap((row) =>
              row.kind === 'group'
                ? (row.group.milestones ?? []).flatMap((m) => {
                    const day = inRange(m.date)
                    return day === null
                      ? []
                      : [
                          <Milestone
                            key={m.id}
                            day={day}
                            label={m.label}
                            done={m.done}
                            top={row.top + 8}
                            dayWidth={dayWidth}
                          />,
                        ]
                  })
                : [],
            )}
            {todayIndex >= 0 && todayIndex < dayCount ? (
              <TodayMarker day={todayIndex} label={false} dayWidth={dayWidth} />
            ) : null}
          </GanttTrack>

          {people ? (
            <div className="ar-gantt-people">
              <div className="ar-gantt-legend" style={{ height: PEOPLE_HEADER }}>
                0
                {[0, 1, 2, 3, 4, 5].map((step) => (
                  <span key={step} className={`ar-heat ar-heat-${step}`} />
                ))}
                5+
              </div>
              {people.map((person) => (
                <div key={person.id} className="ar-gantt-personrow" style={{ height: TASK_ROW }}>
                  <WorkloadRow
                    counts={[...person.counts]}
                    weekends={weekends}
                    dayWidth={dayWidth}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="ar-gantt-load" style={{ height: HEADER }}>
              <WorkloadRow counts={[...workload]} weekends={weekends} dayWidth={dayWidth} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
