import { describe, expect, it } from 'vitest'
import type { NotificationItem } from '@/types/api'
import { groupByDay, notificationHref, notificationView } from './notifications'

const item = (over: Partial<NotificationItem>): NotificationItem => ({
  id: 'n1',
  kind: 'Mention',
  taskId: 't1',
  taskKey: 'SEN-115',
  taskTitle: 'Pipeline GitLab IRS',
  status: 'Blocked',
  projectId: 'p1',
  path: ['Sentul', 'Dispatch'],
  actorName: 'Syaikhan',
  fromName: null,
  excerpt: '@Ahmad bisa dicek?',
  startDate: null,
  dueDate: null,
  lateDays: 0,
  createdAt: '2026-09-28T01:55:00Z',
  read: false,
  ...over,
})

describe('notificationView', () => {
  it('menyusun kalimat setiap jenis seperti mockup 10', () => {
    expect(notificationView(item({}))).toMatchObject({
      label: 'Di-mention',
      icon: 'at',
      tone: 'info',
      who: 'Syaikhan',
      text: 'menyebut Anda di SEN-115',
      detail: '“@Ahmad bisa dicek?”',
      time: '08.55',
    })
    expect(
      notificationView(
        item({
          kind: 'Assigned',
          actorName: 'Wiwiet',
          taskKey: 'MDC-024',
          taskTitle: 'Rencana cut-over',
          path: ['Migrasi Data Center'],
          startDate: '2026-10-05',
        }),
      ),
    ).toMatchObject({
      text: 'menugaskan MDC-024 ke Anda',
      detail: 'Rencana cut-over · Migrasi Data Center · mulai 5 Okt',
      tone: 'primary',
    })
    expect(
      notificationView(item({ kind: 'Moved', fromName: 'Rama', taskKey: 'SEN-117' })),
    ).toMatchObject({
      icon: 'move',
      text: 'memindahkan SEN-117 dari Rama ke Anda',
      detail: 'Pipeline GitLab IRS · Sentul / Dispatch',
    })
    expect(
      notificationView(item({ kind: 'DueTomorrow', actorName: null, dueDate: '2026-09-29' })),
    ).toMatchObject({ who: 'SEN-115', text: 'jatuh tempo besok, 29 Sep', tone: 'warning' })
    expect(notificationView(item({ kind: 'Overdue', actorName: null, lateDays: 2 }))).toMatchObject(
      {
        label: 'Terlambat',
        text: 'lewat tenggat 2 hari',
        tone: 'danger',
      },
    )
  })
})

describe('groupByDay', () => {
  it('memakai hari Asia/Jakarta: "Hari ini", "Kemarin", lalu tanggal', () => {
    const sections = groupByDay(
      [
        item({ id: 'a', createdAt: '2026-09-28T01:55:00Z' }),
        // 27 Sep 23.30 WIB = 27 Sep 16.30 UTC: kemarin, walau tanggal UTC-nya sama dengan hari sebelumnya
        item({ id: 'b', createdAt: '2026-09-27T16:30:00Z' }),
        // 28 Sep 00.10 WIB = 27 Sep 17.10 UTC: sudah hari ini menurut Jakarta
        item({ id: 'c', createdAt: '2026-09-27T17:10:00Z' }),
        item({ id: 'd', createdAt: '2026-09-25T03:00:00Z' }),
        item({ id: 'e', createdAt: '2025-12-30T03:00:00Z' }),
      ],
      '2026-09-28',
    )
    expect(sections.map((s) => [s.label, s.items.map((i) => i.id)])).toEqual([
      ['Hari ini', ['a']],
      ['Kemarin', ['b']],
      ['Hari ini', ['c']],
      ['25 Sep', ['d']],
      ['30 Des 2025', ['e']],
    ])
  })
})

describe('notificationHref', () => {
  it('membuka drawer task di tabel proyeknya', () => {
    expect(notificationHref(item({}))).toBe('/proyek/p1/tabel?task=SEN-115')
  })
})
