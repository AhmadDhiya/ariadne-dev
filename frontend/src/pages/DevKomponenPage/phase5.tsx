import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { StatusPill } from '@/components/atoms/StatusPill'
import { TodayRow } from '@/components/molecules/TodayRow'
import { AddUpdateDialog } from '@/components/organisms/AddUpdateDialog'
import { AttentionPanel } from '@/components/organisms/AttentionPanel'
import { GanttChart, type GanttChartGroup } from '@/components/organisms/GanttChart'
import { GlobalSearch } from '@/components/organisms/GlobalSearch'
import { ProjectPickDialog } from '@/components/organisms/ProjectPickDialog'
import { StatusSelect } from '@/components/organisms/StatusSelect'
import { TodayList } from '@/components/organisms/TodayList'
import type { StatusKey } from '@/lib/status'
import type {
  AttentionItem,
  DashboardGroup,
  SearchResults,
  TaskRow,
  TimelineZoom,
} from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const task = (over: Partial<TaskRow>): TaskRow => ({
  id: 'x',
  key: 'ALP-1',
  number: 1,
  projectId: 'p',
  parentTaskId: null,
  title: 'Judul task',
  status: 'OnProgress',
  priority: 'Medium',
  assignees: [],
  startDate: '2026-09-24',
  dueDate: '2026-09-30',
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

const GROUPS: DashboardGroup[] = [
  {
    kind: 'Overdue',
    tasks: [
      {
        task: task({
          id: 'a',
          key: 'ALP-115',
          title: 'Pipeline CI untuk modul laporan',
          status: 'Blocked',
          priority: 'Critical',
          dueDate: '2026-09-25',
          isOverdue: true,
          lateDays: 3,
        }),
        path: ['Proyek Alpha', 'Modul A'],
      },
    ],
  },
  {
    kind: 'DueToday',
    tasks: [
      {
        task: task({
          id: 'b',
          key: 'ALP-112',
          title: 'Paket uji keamanan',
          priority: 'Critical',
          dueDate: '2026-09-28',
        }),
        path: ['Proyek Alpha'],
      },
    ],
  },
  {
    kind: 'InProgress',
    tasks: [
      {
        task: task({ id: 'c', key: 'BET-21', title: 'Inventaris rak dan kabel', priority: 'High' }),
        path: ['Proyek Beta'],
      },
      {
        task: task({
          id: 'd',
          key: 'ALP-104',
          title: 'Integrasi log dan metrics',
          dueDate: '2026-10-02',
        }),
        path: ['Proyek Alpha', 'Modul A'],
      },
    ],
  },
]

const ATTENTION: AttentionItem[] = [
  {
    kind: 'Mention',
    taskKey: 'ALP-115',
    taskTitle: 'Pipeline CI untuk modul laporan',
    actorName: 'Syaikhan',
    detail: '@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?',
    at: '2026-09-28T01:55:00Z',
    startDate: null,
    dueDate: null,
    lateDays: 0,
  },
  {
    kind: 'Assigned',
    taskKey: 'BET-24',
    taskTitle: 'Rencana cut-over',
    actorName: 'Wiwiet',
    detail: null,
    at: '2026-09-28T01:30:00Z',
    startDate: '2026-10-05',
    dueDate: '2026-10-09',
    lateDays: 0,
  },
  {
    kind: 'DueTomorrow',
    taskKey: 'ALP-124',
    taskTitle: 'Uji ulang oleh klien',
    actorName: null,
    detail: null,
    at: null,
    startDate: null,
    dueDate: '2026-09-29',
    lateDays: 0,
  },
  {
    kind: 'Overdue',
    taskKey: 'ALP-121',
    taskTitle: 'Perbaikan temuan modul absensi',
    actorName: null,
    detail: null,
    at: null,
    startDate: null,
    dueDate: '2026-09-26',
    lateDays: 2,
  },
]

const GANTT: GanttChartGroup[] = [
  {
    id: 'alpha',
    label: 'Proyek Alpha',
    tasks: [
      {
        id: '1',
        key: 'ALP-115',
        title: 'Pipeline CI untuk modul laporan',
        status: 'blocked',
        start: '2026-09-21',
        due: '2026-09-25',
        overdue: true,
      },
      {
        id: '2',
        key: 'ALP-121',
        title: 'Perbaikan temuan modul absensi',
        status: 'fixing',
        start: '2026-09-23',
        due: '2026-09-26',
        overdue: true,
      },
      {
        id: '3',
        key: 'ALP-112',
        title: 'Paket uji keamanan',
        status: 'progress',
        start: '2026-09-21',
        due: '2026-09-28',
        overdue: false,
      },
      {
        id: '4',
        key: 'ALP-104',
        title: 'Integrasi log dan metrics',
        status: 'progress',
        start: '2026-09-28',
        due: '2026-10-02',
        overdue: false,
      },
    ],
  },
  {
    id: 'beta',
    label: 'Proyek Beta',
    tasks: [
      {
        id: '5',
        key: 'BET-21',
        title: 'Inventaris rak dan kabel',
        status: 'progress',
        start: '2026-09-24',
        due: '2026-09-30',
        overdue: false,
      },
      {
        id: '6',
        key: 'BET-24',
        title: 'Rencana cut-over',
        status: 'not-started',
        start: '2026-10-05',
        due: '2026-10-09',
        overdue: false,
      },
    ],
  },
]
const WORKLOAD = [2, 3, 5, 6, 6, 4, 4, 5, 4, 4, 3, 2, 0, 0, 2, 1, 1, 1, 1, 0, 0]

const RESULTS: SearchResults = {
  tasks: [
    {
      id: 't',
      key: 'ALP-115',
      title: 'Pipeline CI untuk modul laporan',
      status: 'Blocked',
      projectId: 'p',
      path: 'Proyek Alpha / Modul A',
    },
  ],
  projects: [{ id: 'p', name: 'Proyek Alpha', path: 'Proyek Alpha' }],
  people: [{ id: 'u', name: 'Rama', projectId: 'p', projectName: 'Proyek Alpha' }],
}

function StatusDemo() {
  const [status, setStatus] = useState<StatusKey>('progress')
  return <StatusSelect status={status} onChange={setStatus} />
}

function GanttDemo() {
  const [zoom, setZoom] = useState<TimelineZoom>('day')
  const range = {
    day: ['2026-09-21', 21],
    week: ['2026-09-21', 70],
    month: ['2026-08-01', 210],
  } as const
  const [start, count] = range[zoom]
  return (
    <div style={{ width: 1144 }} className="ar-card">
      <div style={{ display: 'flex', gap: 8, padding: 12 }}>
        {(['day', 'week', 'month'] as const).map((z) => (
          <Button key={z} size="sm" aria-pressed={z === zoom} onClick={() => setZoom(z)}>
            {z === 'day' ? 'Hari' : z === 'week' ? 'Minggu' : 'Bulan'}
          </Button>
        ))}
      </div>
      <GanttChart
        groups={GANTT}
        rangeStart={start}
        dayCount={count}
        zoom={zoom}
        today="2026-09-28"
        workload={Array.from({ length: count }, (_, i) => WORKLOAD[i % WORKLOAD.length] ?? 0)}
        workloadLabel="Beban kerja saya"
        onOpenTask={noop}
        empty={<p>Kosong</p>}
      />
    </div>
  )
}

function DialogsDemo() {
  const [open, setOpen] = useState<'update' | 'project' | null>(null)
  return (
    <>
      <Button onClick={() => setOpen('update')}>Buka dialog Tambah update</Button>
      <Button onClick={() => setOpen('project')}>Buka dialog pilih proyek</Button>
      <AddUpdateDialog
        open={open === 'update'}
        onClose={() => setOpen(null)}
        taskLabel="ALP-115 Pipeline CI untuk modul laporan"
        onSubmit={() => setOpen(null)}
      />
      <ProjectPickDialog
        open={open === 'project'}
        onClose={() => setOpen(null)}
        projects={[
          { id: 'a', name: 'Proyek Alpha' },
          { id: 'b', name: 'Proyek Beta' },
        ]}
        onPick={() => setOpen(null)}
      />
    </>
  )
}

function SearchDemo() {
  const [query, setQuery] = useState('al')
  return (
    <div style={{ minHeight: 330 }}>
      <GlobalSearch query={query} onQueryChange={setQuery} results={RESULTS} onSelect={noop} />
    </div>
  )
}

/** Molekul Fase 5 (dashboard pribadi). */
export function Phase5Molecules() {
  return (
    <Demo name="TodayRow" note={EXTRA} column surface>
      <div style={{ width: 1000 }}>
        <TodayRow
          priority="critical"
          id="ALP-115"
          title="Pipeline CI untuk modul laporan"
          path="Proyek Alpha / Modul A"
          onOpen={noop}
          due="25 Sep"
          status={<StatusPill status="blocked" />}
          action={
            <Button size="sm" icon="update">
              Tambah update
            </Button>
          }
        />
      </div>
    </Demo>
  )
}

/** Organisme Fase 5: Hari Ini, Perlu perhatian, grafik Gantt dengan beban kerja, pencarian, dan dialog. */
export function Phase5Organisms() {
  return (
    <>
      <Demo name="StatusSelect" note={EXTRA}>
        <StatusDemo />
      </Demo>
      <Demo name="TodayList" note={EXTRA} column scroll>
        <div style={{ width: 820 }}>
          <TodayList
            groups={GROUPS}
            today="2026-09-28"
            onOpenTask={noop}
            onChangeStatus={noop}
            onAddUpdate={noop}
            empty={<p>Kosong</p>}
          />
        </div>
      </Demo>
      <Demo name="AttentionPanel" note={EXTRA} column>
        <AttentionPanel items={ATTENTION} today="2026-09-28" onOpenTask={noop} />
      </Demo>
      <Demo name="GanttChart" note={EXTRA} column scroll>
        <GanttDemo />
      </Demo>
      <Demo name="GlobalSearch" note={EXTRA} column>
        <SearchDemo />
      </Demo>
      <Demo name="AddUpdateDialog + ProjectPickDialog" note={EXTRA}>
        <DialogsDemo />
      </Demo>
    </>
  )
}
