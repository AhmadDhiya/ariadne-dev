import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { EditablePopover } from '@/components/molecules/EditablePopover'
import { EditableText } from '@/components/molecules/EditableText'
import { MentionText } from '@/components/molecules/MentionText'
import { ActivityTimeline } from '@/components/organisms/ActivityTimeline'
import { CommentComposer, type ComposerPerson } from '@/components/organisms/CommentComposer'
import { TaskDrawer } from '@/components/organisms/TaskDrawer'
import type { ActivityItem, TaskDetail, TaskRow } from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined
const resolved = () => Promise.resolve()

const PEOPLE: ComposerPerson[] = [
  { id: 'wi', name: 'Wiwiet', role: 'Anggota' },
  { id: 'ah', name: 'Ahmad', role: 'Pengelola' },
  { id: 'mn', name: 'Manto', role: 'Anggota' },
  { id: 'ra', name: 'Rama', role: 'Anggota' },
  { id: 'bu', name: 'Pak Budi', role: 'Tamu' },
]

const row = (over: Partial<TaskRow>): TaskRow => ({
  id: 't',
  key: 'ALP-115',
  number: 115,
  projectId: 'p',
  parentTaskId: null,
  title: 'Pipeline CI untuk modul laporan',
  status: 'Blocked',
  priority: 'Critical',
  assignees: [
    { id: 'wi', name: 'Wiwiet' },
    { id: 'ah', name: 'Ahmad' },
  ],
  startDate: '2026-09-21',
  dueDate: '2026-09-25',
  durationDays: 5,
  isOverdue: true,
  lateDays: 3,
  holdReason: 'Runner belum bisa mengakses server staging; port 22 dan 443 masih ditutup firewall.',
  waitingOn: 'Manto',
  waitingOnIsPerson: true,
  waitingOnUserId: 'mn',
  heldSince: '2026-09-23T17:00:00Z',
  labels: ['DevOps', 'Infra'],
  subtaskCount: 3,
  subtaskDoneCount: 1,
  lastUpdate: null,
  ...over,
})

const DETAIL: TaskDetail = {
  task: row({}),
  description:
    'Pipeline CI/CD untuk modul laporan: build image, uji otomatis, lalu deploy ke staging.',
  canEdit: true,
  canComment: true,
  rootProjectId: 'root',
  projectPath: ['Proyek Alpha', 'Modul A'],
  parent: null,
  subtasks: [
    row({
      id: 's1',
      key: 'ALP-116',
      title: 'Siapkan runner di VM build',
      status: 'Done',
      assignees: [{ id: 'wi', name: 'Wiwiet' }],
      holdReason: null,
      waitingOn: null,
      waitingOnUserId: null,
      heldSince: null,
    }),
    row({
      id: 's2',
      key: 'ALP-117',
      title: 'Buka akses runner ke staging',
      assignees: [{ id: 'wi', name: 'Wiwiet' }],
    }),
    row({
      id: 's3',
      key: 'ALP-119',
      title: 'Tahap deploy otomatis ke staging',
      status: 'NotStarted',
      assignees: [{ id: 'ah', name: 'Ahmad' }],
      holdReason: null,
      waitingOn: null,
      waitingOnUserId: null,
      heldSince: null,
    }),
  ],
  today: '2026-09-28',
}

const entry = (over: Partial<ActivityItem>): ActivityItem => ({
  id: 'a',
  kind: 'Comment',
  authorId: 'u',
  authorName: 'Syaikhan',
  authorIsGuest: false,
  body: null,
  mentions: [],
  logKind: null,
  data: null,
  createdAt: '2026-09-28T02:12:00Z',
  editedAt: null,
  ...over,
})

const ITEMS: ActivityItem[] = [
  entry({
    id: '1',
    authorName: 'Pak Budi',
    authorIsGuest: true,
    body: 'Tim kami sedang memproses permintaan firewall-nya, estimasi Rabu.',
    createdAt: '2026-09-28T02:30:00Z',
  }),
  entry({
    id: '2',
    kind: 'Internal',
    body: 'Kalau firewall belum dibuka Rabu, eskalasi ke manajer infrastruktur klien.',
    createdAt: '2026-09-28T02:02:00Z',
  }),
  entry({
    id: '3',
    body: '@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?',
    mentions: [{ userId: 'ah', name: 'Ahmad' }],
    createdAt: '2026-09-28T01:55:00Z',
  }),
  entry({
    id: '4',
    kind: 'Update',
    authorName: 'Wiwiet',
    body: 'Runner sudah terpasang, tapi koneksi ke staging timeout. Sudah minta firewall dibuka ke tim jaringan.',
    createdAt: '2026-09-28T01:40:00Z',
  }),
  entry({
    id: '5',
    kind: 'Log',
    authorName: 'Wiwiet',
    logKind: 'StatusChanged',
    data: { from: 'OnProgress', to: 'Blocked' },
    createdAt: '2026-09-28T01:38:00Z',
  }),
  entry({
    id: '6',
    kind: 'Log',
    authorName: 'Wiwiet',
    logKind: 'AssigneesChanged',
    data: { added: ['Wiwiet'], removed: ['Rama'] },
    createdAt: '2026-09-27T05:00:00Z',
  }),
  entry({
    id: '7',
    kind: 'Log',
    authorName: 'Ahmad',
    logKind: 'TaskCreated',
    createdAt: '2026-09-22T05:00:00Z',
  }),
]

function EditableDemo() {
  const [title, setTitle] = useState('Pipeline CI untuk modul laporan')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360 }}>
      <EditableText label="Judul" canEdit required value={title} onSave={setTitle} />
      <EditableText
        label="Keterangan"
        canEdit
        multiline
        value=""
        placeholder="Tambahkan keterangan"
        onSave={noop}
      />
      <EditableText label="Judul" value="Hanya bisa dibaca (Tamu)" onSave={noop} />
      <EditablePopover label="PIC" canEdit display="Wiwiet, Ahmad">
        {(close) => <Button onClick={close}>Tutup panel</Button>}
      </EditablePopover>
    </div>
  )
}

function DrawerDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Buka drawer detail task</Button>
      <TaskDrawer
        open={open}
        onClose={() => setOpen(false)}
        detail={DETAIL}
        people={PEOPLE}
        knownLabels={['UAT', 'API']}
        subProjects={[
          { id: 'p', label: 'Modul A' },
          { id: 'q', label: 'Modul B' },
        ]}
        timeline={{ items: ITEMS }}
        onSave={resolved}
        onChangeStatus={noop}
        onSaveHold={resolved}
        onPostActivity={resolved}
        onOpenTask={noop}
        onAddSubtask={noop}
        onDelete={noop}
        onCopyLink={noop}
      />
    </>
  )
}

/** Molekul Fase 4 (drawer detail task). */
export function Phase4Molecules() {
  return (
    <>
      <Demo name="MentionText" note={EXTRA}>
        <p style={{ margin: 0, maxWidth: 360 }}>
          <MentionText text="@Ahmad bisa dicek? cc @Rama, bukan @Siapa" names={['Ahmad', 'Rama']} />
        </p>
      </Demo>
      <Demo name="EditableText + EditablePopover" note={EXTRA} column>
        <EditableDemo />
      </Demo>
    </>
  )
}

/** Organisme Fase 4: timeline, kotak menulis, dan drawer detail task. */
export function Phase4Organisms() {
  return (
    <>
      <Demo name="ActivityTimeline" note={EXTRA} column surface>
        <div style={{ width: 460 }}>
          <ActivityTimeline
            items={ITEMS}
            today="2026-09-28"
            hasMore
            onLoadMore={noop}
            people={PEOPLE}
            permissionsOf={(item) => ({
              canEdit: item.authorName === 'Syaikhan',
              canDelete: item.authorName === 'Syaikhan',
            })}
            onEdit={resolved}
            onDelete={resolved}
          />
        </div>
      </Demo>
      <Demo name="CommentComposer" note={EXTRA} column surface>
        <div style={{ width: 460 }}>
          <CommentComposer
            kinds={['Update', 'Comment', 'Internal']}
            people={PEOPLE}
            onSubmit={resolved}
          />
        </div>
      </Demo>
      <Demo name="TaskDrawer" note={EXTRA}>
        <DrawerDemo />
      </Demo>
    </>
  )
}
