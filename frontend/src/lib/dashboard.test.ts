import { describe, expect, it } from 'vitest'
import type { AttentionItem, DashboardSummary } from '@/types/api'
import {
  attentionView,
  dueView,
  greeting,
  heldHint,
  isCard,
  lateHint,
  weekHint,
  workingHint,
} from './dashboard'

const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  late: 2,
  lateByPriority: [
    { priority: 'Critical', count: 1 },
    { priority: 'High', count: 1 },
  ],
  dueThisWeek: 5,
  weekEnd: '2026-10-02',
  inProgress: 4,
  inProgressProjects: 2,
  held: 2,
  heldByStatus: [
    { status: 'Blocked', count: 1 },
    { status: 'OnRequest', count: 1 },
  ],
  ...over,
})

describe('petunjuk kartu ringkasan', () => {
  it('sama seperti mockup 02', () => {
    expect(lateHint(summary())).toBe('1 Critical · 1 High')
    expect(weekHint('2026-10-02')).toBe('s.d. Jumat, 2 Okt')
    expect(workingHint(2)).toBe('di 2 proyek')
    expect(heldHint(summary())).toBe('Blocked 1 · On Request 1')
  })

  it('keadaan kosong punya kalimat sendiri', () => {
    expect(lateHint(summary({ late: 0, lateByPriority: [] }))).toBe('Tidak ada yang terlambat')
    expect(heldHint(summary({ held: 0, heldByStatus: [] }))).toBe('Tidak ada yang tertahan')
    expect(workingHint(0)).toBe('Tidak ada yang berjalan')
  })
})

describe('sapaan dan kartu', () => {
  it('menyapa sesuai bagian hari', () => {
    expect(greeting('pagi', 'Ahmad')).toBe('Selamat pagi, Ahmad')
    expect(greeting('malam', 'Ahmad')).toBe('Selamat malam, Ahmad')
  })

  it('hanya kunci kartu yang dikenal yang diterima dari alamat halaman', () => {
    expect(isCard('terlambat')).toBe(true)
    expect(isCard('tertahan')).toBe(true)
    expect(isCard('rahasia')).toBe(false)
    expect(isCard(null)).toBe(false)
  })
})

describe('dueView', () => {
  const today = '2026-09-28'
  it('"Hari ini", tanggal biasa, dan terlambat dengan hitungan hari', () => {
    expect(dueView({ dueDate: '2026-09-28', isOverdue: false, lateDays: 0 }, today)).toEqual({
      text: 'Hari ini',
      overdue: false,
      lateDays: 0,
    })
    expect(dueView({ dueDate: '2026-09-30', isOverdue: false, lateDays: 0 }, today).text).toBe(
      '30 Sep',
    )
    expect(dueView({ dueDate: '2026-09-25', isOverdue: true, lateDays: 3 }, today)).toEqual({
      text: '25 Sep',
      overdue: true,
      lateDays: 3,
    })
  })

  it('tanpa tenggat ditulis "—"; tahun ditulis bila bukan tahun ini', () => {
    expect(dueView({ dueDate: null, isOverdue: false, lateDays: 0 }, today).text).toBe('—')
    expect(dueView({ dueDate: '2027-01-05', isOverdue: false, lateDays: 0 }, today).text).toBe(
      '5 Jan 2027',
    )
  })
})

describe('attentionView', () => {
  const base: AttentionItem = {
    kind: 'Mention',
    taskKey: 'SEN-115',
    taskTitle: 'Pipeline GitLab IRS',
    actorName: 'Syaikhan',
    detail: '@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?',
    at: '2026-09-28T01:55:00Z',
    startDate: null,
    dueDate: null,
    lateDays: 0,
  }

  it('mention: siapa, di task mana, kutipan, dan jam', () => {
    expect(attentionView(base, '2026-09-28')).toEqual({
      label: 'Di-mention',
      icon: 'at',
      tone: 'info',
      who: 'Syaikhan',
      text: 'menyebut Anda di SEN-115',
      detail: '“@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?”',
      time: '08.55',
    })
  })

  it('penugasan: judul task dan tanggal mulainya', () => {
    const view = attentionView(
      {
        ...base,
        kind: 'Assigned',
        taskKey: 'MDC-024',
        taskTitle: 'Rencana cut-over',
        actorName: 'Wiwiet',
        detail: null,
        startDate: '2026-10-05',
      },
      '2026-09-28',
    )
    expect(view).toMatchObject({
      label: 'Task baru ditugaskan',
      who: 'Wiwiet',
      text: 'menugaskan MDC-024 ke Anda',
      detail: 'Rencana cut-over · mulai 5 Okt',
    })
    expect(
      attentionView({ ...base, kind: 'Assigned', detail: null, startDate: null }, '2026-09-28')
        .detail,
    ).toBe('Pipeline GitLab IRS')
  })

  it('terlambat dan tenggat besok dihitung dari tenggat, tanpa jam', () => {
    const late = attentionView(
      {
        ...base,
        kind: 'Overdue',
        actorName: null,
        detail: null,
        at: null,
        lateDays: 2,
        taskKey: 'SEN-121',
        taskTitle: 'Perbaikan temuan',
      },
      '2026-09-28',
    )
    expect(late).toMatchObject({
      label: 'Terlambat',
      tone: 'danger',
      who: 'SEN-121',
      text: 'lewat tenggat 2 hari',
      detail: 'Perbaikan temuan',
      time: null,
    })
    const soon = attentionView(
      { ...base, kind: 'DueTomorrow', actorName: null, detail: null, at: null },
      '2026-09-28',
    )
    expect(soon).toMatchObject({ label: 'Tenggat besok', text: 'jatuh tempo besok', time: null })
  })

  it('mention kemarin memakai kata "Kemarin"', () => {
    expect(attentionView({ ...base, at: '2026-09-27T05:00:00Z' }, '2026-09-28').time).toBe(
      'Kemarin',
    )
  })
})
