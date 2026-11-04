import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { ChangeDatesDialog } from '@/components/organisms/ChangeDatesDialog'
import { MoveTaskDialog } from '@/components/organisms/MoveTaskDialog'
import { TeamTimelineGrid, type TeamGridPerson } from '@/components/organisms/TeamTimelineGrid'
import type { MoveCandidates } from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const COUNTS = [4, 5, 6, 6, 6, 0, 0, 5, 5, 4, 4, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0]

const PEOPLE: TeamGridPerson[] = [
  {
    id: 'r',
    name: 'Rama',
    counts: COUNTS,
    tasks: [
      {
        id: '1',
        key: 'SEN-150',
        title: 'Uji beban Dispatch',
        status: 'progress',
        priority: 'high',
        start: '2026-09-29',
        due: '2026-10-01',
        overdue: false,
        project: 'Sentul / Testing Oktober',
      },
      {
        id: '2',
        key: 'SEN-115',
        title: 'Pipeline GitLab IRS',
        status: 'blocked',
        priority: 'critical',
        start: '2026-09-21',
        due: '2026-09-25',
        overdue: true,
        project: 'Sentul / Dispatch',
      },
    ],
  },
  { id: 'k', name: 'Khalil', counts: COUNTS.map((c) => Math.min(c, 2)), tasks: [] },
]

const CANDIDATES: MoveCandidates = {
  start: '2026-09-29',
  dayCount: 3,
  assignees: [{ id: 'r', name: 'Rama' }],
  candidates: [
    { userId: 'k', name: 'Khalil', isAssignee: false, counts: [1, 1, 2], peak: 2 },
    { userId: 'b', name: 'Bintang', isAssignee: false, counts: [4, 5, 6], peak: 6 },
  ],
}

function DialogsDemo() {
  const [move, setMove] = useState(false)
  const [dates, setDates] = useState(false)
  return (
    <>
      <Button onClick={() => setMove(true)}>Buka Pindahkan ke…</Button>
      <Button onClick={() => setDates(true)}>Buka Ubah tanggal</Button>
      <MoveTaskDialog
        open={move}
        onClose={() => setMove(false)}
        taskLabel="SEN-150 Uji beban Dispatch"
        context="29 Sep – 1 Okt · saat ini: Rama"
        from={{ id: 'r', name: 'Rama' }}
        candidates={CANDIDATES}
        onSubmit={() => setMove(false)}
      />
      <ChangeDatesDialog
        open={dates}
        onClose={() => setDates(false)}
        taskLabel="SEN-150 Uji beban Dispatch"
        initial={{ start: '2026-09-29', end: '2026-10-01' }}
        onSubmit={() => setDates(false)}
      />
    </>
  )
}

/** Organisme Fase 7: Timeline Tim, dialog Pindahkan ke…, dan dialog Ubah tanggal. */
export function Phase7Organisms() {
  return (
    <>
      <Demo name="TeamTimelineGrid" note={EXTRA} column scroll>
        <div className="ar-card" style={{ width: 1144 }}>
          <TeamTimelineGrid
            people={PEOPLE}
            rangeStart="2026-09-21"
            dayCount={21}
            zoom="day"
            today="2026-09-28"
            expanded={new Set(['r'])}
            onToggle={noop}
            onOpenPerson={noop}
            onOpenTask={noop}
            onMoveTask={noop}
            onChangeDates={noop}
            empty={<p>Kosong</p>}
          />
        </div>
      </Demo>
      <Demo name="MoveTaskDialog dan ChangeDatesDialog" note={EXTRA}>
        <DialogsDemo />
      </Demo>
    </>
  )
}
