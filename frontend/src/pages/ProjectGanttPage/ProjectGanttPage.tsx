import { useMemo, useState } from 'react'
import { messageOf } from '@/api/errors'
import { useGantt } from '@/api/gantt'
import { useProjectMembers, useProjectTree } from '@/api/projects'
import { useProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { FilterBar } from '@/components/organisms/FilterBar'
import {
  GanttChart,
  type GanttChartGroup,
  type GanttChartMilestone,
} from '@/components/organisms/GanttChart'
import { useTaskParam } from '@/hooks/useTaskParam'
import { addDays, rangeLabel, ZOOM_LABELS } from '@/lib/gantt'
import { milestoneLabel } from '@/lib/milestones'
import { priorityFromApi, statusFromApi } from '@/lib/status'
import { EMPTY_FILTERS, hasActiveFilters } from '@/lib/taskFilters'
import { buildTaskGroups } from '@/lib/taskGroups'
import type { TimelineZoom } from '@/types/api'
import './ProjectGanttPage.css'

const ZOOMS = Object.keys(ZOOM_LABELS) as TimelineZoom[]

/**
 * Tab Gantt (mockup 04): bar task per sub-proyek bersama milestone, garis hari ini, dan beban kerja per orang. Daftar
 * task dan saringannya sama dengan tab Tabel (dari server); rentang tanggal, milestone, dan beban kerja datang dari
 * endpoint Gantt. Grafik digulir ke samping; "Hari ini" membawanya kembali ke hari ini.
 */
export function ProjectGanttPage() {
  const { project, tasks, filters, onFiltersChange } = useProjectContext()
  const taskParam = useTaskParam()
  const tree = useProjectTree()
  const members = useProjectMembers(project.id)
  const [zoom, setZoom] = useState<TimelineZoom>('day')
  const [todayKey, setTodayKey] = useState(0)
  const gantt = useGantt(project.id, zoom)

  const people = useMemo(
    () =>
      (members.data ?? [])
        .filter((m) => m.role !== 'Tamu')
        .map((m) => ({ id: m.userId, name: m.displayName })),
    [members.data],
  )

  const groups = useMemo<GanttChartGroup[]>(() => {
    const built = buildTaskGroups(tree.data ?? [], project.id, tasks.data?.tasks ?? [], true).map(
      (group) => ({
        id: group.id,
        label: group.label,
        milestones: [] as GanttChartMilestone[],
        tasks: group.tasks.map((task) => ({
          id: task.id,
          key: task.key,
          title: task.title,
          status: statusFromApi(task.status),
          start: task.startDate,
          due: task.dueDate,
          overdue: task.isOverdue,
          assignees: task.assignees.map((a) => a.name),
          priority: priorityFromApi(task.priority),
          subtask: task.parentTaskId !== null,
        })),
      }),
    )
    // Milestone digambar di baris sub-proyeknya; yang sub-proyeknya tidak tampil (tanpa task) ikut baris pertama
    const year = gantt.data ? Number(gantt.data.today.slice(0, 4)) : undefined
    for (const milestone of gantt.data?.milestones ?? []) {
      const target = built.find((g) => g.id === milestone.projectId) ?? built[0]
      target?.milestones.push({
        id: milestone.id,
        label: milestoneLabel(milestone, year),
        date: milestone.date,
        done: milestone.isDone,
      })
    }
    return built
  }, [tree.data, project.id, tasks.data, gantt.data])

  if (tasks.isPending || tree.isPending || gantt.isPending) {
    return <p role="status">Memuat Gantt…</p>
  }
  if (tasks.isError || gantt.isError) {
    return (
      <EmptyState
        title="Gantt tidak bisa dimuat"
        description={messageOf(tasks.error ?? gantt.error)}
        action={
          <Button
            onClick={() => {
              void tasks.refetch()
              void gantt.refetch()
            }}
          >
            Coba lagi
          </Button>
        }
      />
    )
  }

  const data = gantt.data
  const end = addDays(data.start, data.dayCount - 1)
  const filtered = hasActiveFilters(filters)

  return (
    <div className="ar-ganttpage">
      <div className="ar-ganttpage-toolbar">
        <SegmentedControl
          label="Skala waktu"
          value={zoom}
          onChange={setZoom}
          options={ZOOMS.map((value) => ({ value, label: ZOOM_LABELS[value] }))}
        />
        <Button size="sm" icon="calendar" onClick={() => setTodayKey((k) => k + 1)}>
          Hari ini
        </Button>
        <span className="ar-ganttpage-sep" aria-hidden />
        <FilterBar
          filters={filters}
          onChange={onFiltersChange}
          people={people}
          labels={[]}
          controls={['pic', 'status', 'overdue']}
        />
        <span className="ar-ganttpage-range">
          {rangeLabel(data.start, data.dayCount)} {end.slice(0, 4)}
        </span>
      </div>

      <section className="ar-card ar-ganttpage-card" aria-label="Gantt proyek">
        <GanttChart
          detailed
          leftWidth={360}
          groups={groups}
          rangeStart={data.start}
          dayCount={data.dayCount}
          zoom={data.zoom}
          today={data.today}
          people={data.workload.map((p) => ({
            id: p.userId,
            name: p.name,
            counts: p.columnCounts,
          }))}
          scrollToTodayKey={todayKey}
          onOpenTask={(key) => taskParam.open(key)}
          empty={
            filtered ? (
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
                icon="timeline"
                title="Belum ada task untuk digambar"
                description="Tambahkan task dengan tanggal; barnya muncul di sini."
              />
            )
          }
        />
      </section>
    </div>
  )
}
