import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { GanttChart, type GanttChartGroup } from '@/components/organisms/GanttChart'
import { MilestoneFormDialog } from '@/components/organisms/MilestoneFormDialog'
import { MilestoneTable } from '@/components/organisms/MilestoneTable'
import type { MilestoneItem } from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const GROUPS: GanttChartGroup[] = [
  {
    id: 'a',
    label: 'Modul A',
    milestones: [{ id: 'm', label: 'Go-Live · 30 Sep', date: '2026-09-30', done: false }],
    tasks: [
      {
        id: '1',
        key: 'ALP-104',
        title: 'Integrasi log dan metrics',
        status: 'progress',
        start: '2026-09-28',
        due: '2026-10-02',
        overdue: false,
        assignees: ['Ahmad', 'Rama'],
        priority: 'medium',
      },
      {
        id: '2',
        key: 'ALP-115',
        title: 'Pipeline CI untuk modul laporan',
        status: 'blocked',
        start: '2026-09-21',
        due: '2026-09-25',
        overdue: true,
        assignees: ['Wiwiet', 'Ahmad'],
        priority: 'critical',
      },
      {
        id: '3',
        key: 'ALP-122',
        title: 'Validasi jam masuk shift malam',
        status: 'fixing',
        start: '2026-09-23',
        due: '2026-09-26',
        overdue: true,
        assignees: ['Ahmad'],
        priority: 'high',
        subtask: true,
      },
    ],
  },
]

const COUNTS = [4, 5, 6, 6, 6, 0, 0, 5, 5, 4, 4, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0]

const MILESTONES: MilestoneItem[] = [
  {
    id: 'a',
    projectId: 'p',
    path: ['Proyek Alpha', 'Modul A'],
    name: 'UAT',
    date: '2026-10-05',
    isDone: false,
  },
  {
    id: 'b',
    projectId: 'q',
    path: ['Proyek Alpha'],
    name: 'Go-Live',
    date: '2026-10-30',
    isDone: true,
  },
]

function FormDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Buka dialog Tambah milestone</Button>
      <MilestoneFormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah milestone"
        submitLabel="Tambah milestone"
        projects={[
          { id: 'q', label: 'Proyek Alpha' },
          { id: 'p', label: 'Modul A' },
        ]}
        onSubmit={() => setOpen(false)}
      />
    </>
  )
}

/** Organisme Fase 6: Gantt proyek (tampilan detail) dan milestone. */
export function Phase6Organisms() {
  return (
    <>
      <Demo name="GanttChart (tampilan proyek)" note={EXTRA} column scroll>
        <div className="ar-card" style={{ width: 1144 }}>
          <GanttChart
            detailed
            leftWidth={360}
            groups={GROUPS}
            rangeStart="2026-09-21"
            dayCount={21}
            zoom="day"
            today="2026-09-28"
            people={[
              { id: 'a', name: 'Ahmad', counts: COUNTS },
              { id: 'w', name: 'Wiwiet', counts: COUNTS.map((c) => Math.min(c, 1)) },
            ]}
            onOpenTask={noop}
            empty={<p>Kosong</p>}
          />
        </div>
      </Demo>
      <Demo name="MilestoneTable" note={EXTRA} column surface>
        <div style={{ width: 760 }}>
          <MilestoneTable
            milestones={MILESTONES}
            canManage
            currentYear={2026}
            onEdit={noop}
            onDelete={noop}
            onToggleDone={noop}
            empty={<p>Kosong</p>}
          />
        </div>
      </Demo>
      <Demo name="MilestoneFormDialog" note={EXTRA}>
        <FormDemo />
      </Demo>
    </>
  )
}
