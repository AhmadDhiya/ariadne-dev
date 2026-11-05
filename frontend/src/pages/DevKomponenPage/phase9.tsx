import { useState } from 'react'
import { IconButton } from '@/components/atoms/IconButton'
import { NotificationRow } from '@/components/molecules/NotificationRow'
import { NotificationPanel } from '@/components/organisms/NotificationPanel'
import type { NotificationFilter, NotificationItem } from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const item = (over: Partial<NotificationItem>): NotificationItem => ({
  id: 'n',
  kind: 'Mention',
  taskId: 't',
  taskKey: 'SEN-115',
  taskTitle: 'Pipeline GitLab IRS',
  status: 'Blocked',
  projectId: 'p',
  path: ['Sentul', 'Dispatch'],
  actorName: 'Syaikhan',
  fromName: null,
  excerpt: '@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?',
  startDate: null,
  dueDate: null,
  lateDays: 0,
  createdAt: '2026-09-28T01:55:00Z',
  read: false,
  ...over,
})

// Isi panel mockup 10
const ITEMS: NotificationItem[] = [
  item({ id: '1' }),
  item({
    id: '2',
    kind: 'Assigned',
    actorName: 'Wiwiet',
    taskKey: 'MDC-024',
    taskTitle: 'Rencana cut-over',
    path: ['Migrasi Data Center'],
    startDate: '2026-10-05',
    createdAt: '2026-09-28T01:30:00Z',
  }),
  item({
    id: '3',
    kind: 'Moved',
    taskKey: 'SEN-117',
    taskTitle: 'Buka akses runner ke staging',
    fromName: 'Rama',
    createdAt: '2026-09-28T01:12:00Z',
  }),
  item({
    id: '4',
    kind: 'DueTomorrow',
    actorName: null,
    taskKey: 'MDC-025',
    taskTitle: 'Label ulang kabel rak A',
    path: ['Migrasi Data Center'],
    dueDate: '2026-09-29',
    createdAt: '2026-09-28T00:00:01Z',
  }),
  item({
    id: '5',
    kind: 'Overdue',
    actorName: null,
    taskKey: 'SEN-121',
    taskTitle: 'Perbaikan temuan UAT modul absensi',
    path: ['Sentul', 'SLMS'],
    lateDays: 2,
    createdAt: '2026-09-28T00:00:00Z',
    read: true,
  }),
  item({
    id: '6',
    actorName: 'Khalil',
    taskKey: 'SEN-112',
    excerpt: 'Draf laporan PenTest sudah saya unggah, mohon review.',
    createdAt: '2026-09-27T09:40:00Z',
    read: true,
  }),
]

function PanelDemo() {
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const items =
    filter === 'unread'
      ? ITEMS.filter((i) => !i.read)
      : filter === 'mentions'
        ? ITEMS.filter((i) => i.kind === 'Mention')
        : ITEMS
  return (
    <div className="ar-dev-notif">
      <IconButton icon="bell" label="Notifikasi" badge={4} />
      <NotificationPanel
        items={items}
        today="2026-09-28"
        unread={4}
        filter={filter}
        onFilterChange={setFilter}
        onOpen={noop}
        onMarkAllRead={noop}
        onSeeAll={noop}
      />
    </div>
  )
}

/** Molekul Fase 9: satu baris notifikasi. */
export function Phase9Molecules() {
  return (
    <Demo name="NotificationRow" note={EXTRA} column>
      <div style={{ width: 420 }}>
        <NotificationRow
          label="Task dipindahkan"
          icon="move"
          tone="muted"
          who="Syaikhan"
          text="memindahkan SEN-117 dari Rama ke Anda"
          detail="Buka akses runner ke staging · Sentul / Dispatch"
          time="08.12"
          unread
          href="#"
          onOpen={noop}
        />
        <NotificationRow
          label="Terlambat"
          icon="calendar"
          tone="danger"
          who="SEN-121"
          text="lewat tenggat 2 hari"
          detail="Perbaikan temuan UAT modul absensi · Sentul / SLMS"
          time="07.00"
          unread={false}
          href="#"
          onOpen={noop}
        />
      </div>
    </Demo>
  )
}

/** Organisme Fase 9: lonceng dengan panel notifikasi (mockup 10). */
export function Phase9Organisms() {
  return (
    <Demo name="NotificationPanel" note={EXTRA} column>
      <PanelDemo />
    </Demo>
  )
}
