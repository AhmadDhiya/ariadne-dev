import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { GroupRow } from '@/components/molecules/GroupRow'
import { ProjectProgress } from '@/components/molecules/ProjectProgress'
import { TaskRow } from '@/components/molecules/TaskRow'
import { FilterBar } from '@/components/organisms/FilterBar'
import { HoldReasonDialog } from '@/components/organisms/HoldReasonDialog'
import { TaskFormDialog } from '@/components/organisms/TaskFormDialog'
import { TaskTable, type TaskGroup } from '@/components/organisms/TaskTable'
import { StatusPill } from '@/components/atoms/StatusPill'
import { EMPTY_FILTERS, type TaskFilters } from '@/lib/taskFilters'
import type { TaskRow as TaskRowData } from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const PEOPLE = [
  { id: '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b', name: 'Ahmad' },
  { id: '4a3c9d2f-6e5b-4c7a-8b8f-2d3e4f5a6b7c', name: 'Rama' },
  { id: '5b4dae30-7f6c-4d8b-9c90-3e4f5a6b7c8d', name: 'Manto' },
]

const task = (over: Partial<TaskRowData>): TaskRowData => ({
  id: 'x',
  key: 'SEN-1',
  number: 1,
  projectId: 'p',
  parentTaskId: null,
  title: 'Judul task',
  status: 'OnProgress',
  priority: 'Medium',
  assignees: [{ id: 'a', name: 'Ahmad' }],
  startDate: '2026-09-28',
  dueDate: '2026-10-02',
  durationDays: 5,
  isOverdue: false,
  lateDays: 0,
  holdReason: null,
  waitingOn: null,
  waitingOnIsPerson: false,
  waitingOnUserId: null,
  heldSince: null,
  labels: [],
  subtaskCount: 0,
  subtaskDoneCount: 0,
  lastUpdate: null,
  ...over,
})

const GROUPS: TaskGroup[] = [
  {
    id: 'g1',
    label: 'Dispatch',
    tasks: [
      task({
        id: '1',
        key: 'SEN-101',
        title: 'Pengisian Kebutuhan Server',
        status: 'Done',
        priority: 'High',
        startDate: '2026-09-14',
        dueDate: '2026-09-18',
        labels: ['Infra'],
      }),
      task({
        id: '2',
        key: 'SEN-115',
        title: 'Pipeline GitLab IRS',
        status: 'Blocked',
        priority: 'Critical',
        assignees: [
          { id: 'w', name: 'Wiwiet' },
          { id: 'a', name: 'Ahmad' },
        ],
        startDate: '2026-09-21',
        dueDate: '2026-09-25',
        isOverdue: true,
        lateDays: 3,
        holdReason:
          'Runner belum bisa mengakses server staging; port 22 dan 443 masih ditutup firewall.',
        waitingOn: 'Manto',
        waitingOnIsPerson: true,
        heldSince: '2026-09-24T01:00:00Z',
        labels: ['DevOps'],
      }),
    ],
  },
  {
    id: 'g2',
    label: 'SLMS / Temuan UAT & API',
    tasks: [
      task({
        id: '3',
        key: 'SEN-121',
        title: 'Perbaikan temuan UAT modul absensi',
        status: 'Fixing',
        priority: 'High',
        subtaskCount: 3,
        subtaskDoneCount: 1,
        labels: ['UAT'],
      }),
      task({
        id: '4',
        key: 'SEN-122',
        title: 'Validasi jam masuk shift malam',
        status: 'Fixing',
        priority: 'High',
        parentTaskId: '3',
        labels: ['UAT'],
      }),
      task({
        id: '5',
        key: 'SEN-124',
        title: 'Uji ulang oleh klien',
        status: 'NotStarted',
        parentTaskId: '3',
        labels: ['UAT'],
      }),
    ],
  },
]

function TableDemo() {
  return (
    <TaskTable
      groups={GROUPS}
      today="2026-09-28"
      canEdit
      onChangeStatus={noop}
      onOpenTask={noop}
      empty={<p>Belum ada task</p>}
    />
  )
}

function FilterDemo() {
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS)
  return (
    <FilterBar
      filters={filters}
      onChange={setFilters}
      people={PEOPLE}
      labels={['UAT', 'API', 'DevOps']}
    />
  )
}

function DialogsDemo() {
  const [open, setOpen] = useState<'hold' | 'task' | null>(null)
  return (
    <>
      <Button onClick={() => setOpen('hold')}>Buka dialog alasan tertahan</Button>
      <Button onClick={() => setOpen('task')}>Buka dialog tambah task</Button>
      <HoldReasonDialog
        open={open === 'hold'}
        onClose={() => setOpen(null)}
        status="blocked"
        taskLabel="SEN-115 Pipeline GitLab IRS"
        people={PEOPLE}
        onSubmit={() => setOpen(null)}
      />
      <TaskFormDialog
        open={open === 'task'}
        onClose={() => setOpen(null)}
        title="Tambah task"
        description="Di Sentul. Nomor task dibuat otomatis."
        submitLabel="Tambah task"
        projects={[
          { id: 'p1', label: 'Sentul' },
          { id: 'p2', label: 'Dispatch' },
        ]}
        people={PEOPLE}
        knownLabels={['UAT', 'API']}
        onSubmit={() => setOpen(null)}
      />
    </>
  )
}

/** Molekul dan organisme Fase 3 (tabel task). */
export function Phase3Demos() {
  return (
    <>
      <Demo name="ProjectProgress" note={EXTRA}>
        <ProjectProgress projectName="Sentul" done={41} total={71} percent={58} />
      </Demo>
      <Demo name="GroupRow + TaskRow" note={EXTRA} scroll>
        <table style={{ width: 1000, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <tbody>
            <GroupRow
              title="Dispatch"
              meta="2 task"
              collapsed={false}
              colSpan={10}
              onToggle={noop}
            />
            <TaskRow
              id="SEN-104"
              title="Integrasi log & metrics"
              priority="medium"
              status={<StatusPill status="progress" />}
              assignees={['Ahmad', 'Rama']}
              start="28 Sep"
              due="2 Okt"
              duration={5}
              labels={['Monitoring']}
            />
          </tbody>
        </table>
      </Demo>
      <Demo name="FilterBar" note={EXTRA} column>
        <FilterDemo />
      </Demo>
      <Demo name="TaskTable" note={EXTRA} scroll>
        <div style={{ width: 1144 }}>
          <TableDemo />
        </div>
      </Demo>
      <Demo name="HoldReasonDialog + TaskFormDialog" note={EXTRA}>
        <DialogsDemo />
      </Demo>
    </>
  )
}
