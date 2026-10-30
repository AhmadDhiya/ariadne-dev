import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Icon } from '@/components/atoms/Icon'
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
  layoutRows,
} from '@/lib/gantt'
import type { StatusKey } from '@/lib/status'
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
}

export interface GanttChartGroup {
  id: string
  label: string
  tasks: GanttChartTask[]
}

export interface GanttChartProps {
  groups: readonly GanttChartGroup[]
  /** Hari pertama grafik ("YYYY-MM-DD") dan jumlah harinya. */
  rangeStart: string
  dayCount: number
  zoom: TimelineZoom
  /** Hari ini menurut server ("YYYY-MM-DD"): letak garis "Hari ini". */
  today: string
  /** Jumlah task aktif per hari (dari server), sejajar dengan kolom grafik. */
  workload: readonly number[]
  /** Nama baris beban kerja, mis. "Beban kerja saya". */
  workloadLabel: string
  onOpenTask?: (key: string) => void
  /** Ditampilkan menggantikan grafik bila tidak ada task di rentang ini. */
  empty: ReactNode
}

const GROUP_ROW = 32
const TASK_ROW = 36
const HEADER = 44

/**
 * Grafik Gantt (mockup 02 dan 04): daftar task di kiri, grid hari dengan bar bersama garis "Hari ini" di kanan, dan baris
 * beban kerja di bawah. Posisi bar dan angka beban dihitung di server dan `lib/gantt`; komponen ini hanya menggambar.
 * Dipakai untuk Timeline saya (Fase 5), dan nanti Gantt proyek serta Timeline Tim.
 */
export function GanttChart({
  groups,
  rangeStart,
  dayCount,
  zoom,
  today,
  workload,
  workloadLabel,
  onOpenTask,
  empty,
}: GanttChartProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const dayWidth = DAY_WIDTH[zoom]
  const days = useMemo(() => ganttDays(rangeStart, dayCount), [rangeStart, dayCount])
  const segments = useMemo(() => headerSegments(days, zoom), [days, zoom])
  const todayIndex = dayIndex(rangeStart, today)
  const weekends = days.flatMap((d, i) => (d.weekend ? [i] : []))

  if (groups.length === 0) return <div className="ar-gantt-empty">{empty}</div>

  // Baris yang tampil, dengan letak vertikal masing-masing (bar mengikuti baris tasknya)
  const { rows, height: chartHeight } = layoutRows<GanttChartGroup, GanttChartTask>(
    groups,
    collapsed,
    GROUP_ROW,
    TASK_ROW,
  )

  return (
    <div className="ar-gantt">
      <div className="ar-gantt-left">
        <div className="ar-gantt-lefthead" style={{ height: HEADER }}>
          Task
        </div>
        {rows.map((row) =>
          row.kind === 'group' ? (
            <button
              key={`g-${row.group.id}`}
              type="button"
              className="ar-gantt-group"
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
              <div key={row.task.id} className="ar-gantt-task" style={{ height: TASK_ROW }}>
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
              </div>
            )
          ),
        )}
        <div className="ar-gantt-leftfoot" style={{ height: HEADER }}>
          {workloadLabel}
        </div>
      </div>

      <div className="ar-gantt-right" role="region" aria-label="Grafik timeline" tabIndex={0}>
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
            {rows.map((row) => {
              if (row.kind !== 'task' || !row.task) return null
              const geometry = barGeometry(rangeStart, dayCount, row.task.start, row.task.due)
              return geometry ? (
                <Fragment key={row.task.id}>
                  <GanttBar
                    status={row.task.status}
                    start={geometry.start}
                    span={geometry.span}
                    top={row.top + 8}
                    overdue={row.task.overdue}
                    dayWidth={dayWidth}
                  />
                </Fragment>
              ) : null
            })}
            {todayIndex >= 0 && todayIndex < dayCount ? (
              <TodayMarker day={todayIndex} label={false} dayWidth={dayWidth} />
            ) : null}
          </GanttTrack>
          <div className="ar-gantt-load" style={{ height: HEADER }}>
            <WorkloadRow counts={[...workload]} weekends={weekends} dayWidth={dayWidth} />
          </div>
        </div>
      </div>
    </div>
  )
}
