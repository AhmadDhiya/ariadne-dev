import { describe, expect, it } from 'vitest'
import {
  addDays,
  barGeometry,
  dayIndex,
  ganttDays,
  headerSegments,
  layoutRows,
  rangeLabel,
} from './gantt'

describe('tanggal kalender', () => {
  it('addDays dan dayIndex melewati pergantian bulan dan tahun', () => {
    expect(addDays('2026-09-28', 3)).toBe('2026-10-01')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(dayIndex('2026-09-21', '2026-10-11')).toBe(20)
    expect(dayIndex('2026-09-21', '2026-09-14')).toBe(-7)
  })
})

describe('ganttDays', () => {
  const days = ganttDays('2026-09-21', 21) // Senin 21 Sep, seperti mockup 02

  it('21 hari dengan huruf hari sama seperti mockup (S S R K J S M)', () => {
    expect(days).toHaveLength(21)
    expect(days.slice(0, 7).map((d) => d.letter)).toEqual(['S', 'S', 'R', 'K', 'J', 'S', 'M'])
    expect(days.slice(0, 3).map((d) => d.dayOfMonth)).toEqual([21, 22, 23])
    expect(days[10]?.dayOfMonth).toBe(1) // 1 Okt
  })

  it('akhir pekan adalah Sabtu dan Minggu (indeks 5, 6, 12, 13, 19, 20)', () => {
    expect(days.flatMap((d, i) => (d.weekend ? [i] : []))).toEqual([5, 6, 12, 13, 19, 20])
  })
})

describe('headerSegments', () => {
  it('zoom Hari: satu kolom per hari berisi tanggalnya', () => {
    const segments = headerSegments(ganttDays('2026-09-21', 21), 'day')
    expect(segments).toHaveLength(21)
    expect(segments[9]).toEqual({ label: '30', from: 9, span: 1 })
  })

  it('zoom Minggu: satu segmen per pekan, diberi tanggal Seninnya', () => {
    const segments = headerSegments(ganttDays('2026-09-21', 70), 'week')
    expect(segments).toHaveLength(10)
    expect(segments.slice(0, 3)).toEqual([
      { label: '21 Sep', from: 0, span: 7 },
      { label: '28 Sep', from: 7, span: 7 },
      { label: '5 Okt', from: 14, span: 7 },
    ])
  })

  it('zoom Minggu yang dimulai di tengah pekan: segmen pertama lebih pendek', () => {
    const segments = headerSegments(ganttDays('2026-09-23', 14), 'week')
    expect(segments.map((s) => [s.label, s.span])).toEqual([
      ['23 Sep', 5],
      ['28 Sep', 7],
      ['5 Okt', 2],
    ])
  })

  it('zoom Bulan: satu segmen per bulan, tahun ditulis di yang pertama dan setiap Januari', () => {
    const segments = headerSegments(ganttDays('2026-08-01', 210), 'month')
    expect(segments.map((s) => s.label)).toEqual([
      'Agu 2026',
      'Sep',
      'Okt',
      'Nov',
      'Des',
      'Jan 2027',
      'Feb',
    ])
    expect(segments.map((s) => s.span)).toEqual([31, 30, 31, 30, 31, 31, 26])
    expect(segments.reduce((sum, s) => sum + s.span, 0)).toBe(210)
  })
})

describe('barGeometry', () => {
  const start = '2026-09-21'

  it('bar di dalam rentang: indeks mulai dan jumlah hari inklusif', () => {
    expect(barGeometry(start, 21, '2026-09-21', '2026-09-25')).toEqual({ start: 0, span: 5 }) // SEN-115
    expect(barGeometry(start, 21, '2026-09-28', '2026-10-02')).toEqual({ start: 7, span: 5 }) // SEN-104
  })

  it('dipotong di kedua ujung rentang', () => {
    expect(barGeometry(start, 21, '2026-09-10', '2026-09-22')).toEqual({ start: 0, span: 2 })
    expect(barGeometry(start, 21, '2026-10-09', '2026-10-20')).toEqual({ start: 18, span: 3 })
    expect(barGeometry(start, 21, '2026-08-01', '2026-12-01')).toEqual({ start: 0, span: 21 })
  })

  it('di luar rentang atau tanpa tanggal: tidak ada bar', () => {
    expect(barGeometry(start, 21, '2026-08-01', '2026-09-20')).toBeNull()
    expect(barGeometry(start, 21, '2026-10-12', '2026-10-15')).toBeNull()
    expect(barGeometry(start, 21, null, null)).toBeNull()
  })

  it('satu tanggal saja menjadi bar satu hari', () => {
    expect(barGeometry(start, 21, null, '2026-09-30')).toEqual({ start: 9, span: 1 })
    expect(barGeometry(start, 21, '2026-09-30', null)).toEqual({ start: 9, span: 1 })
  })
})

describe('rangeLabel', () => {
  it('menulis rentang seperti judul mockup', () => {
    expect(rangeLabel('2026-09-21', 21)).toBe('21 Sep – 11 Okt')
  })
})

describe('layoutRows', () => {
  const groups = [
    { id: 'a', tasks: ['a1', 'a2'] },
    { id: 'b', tasks: ['b1'] },
  ]

  it('grup diikuti task-nya, dengan jarak dari atas dan tinggi total', () => {
    const { rows, height } = layoutRows(groups, new Set(), 32, 36)

    expect(rows.map((r) => [r.kind, r.task ?? r.group.id, r.top])).toEqual([
      ['group', 'a', 0],
      ['task', 'a1', 32],
      ['task', 'a2', 68],
      ['group', 'b', 104],
      ['task', 'b1', 136],
    ])
    expect(height).toBe(172)
  })

  it('grup yang dilipat tetap tampil tanpa task-nya, dan baris sesudahnya naik', () => {
    const { rows, height } = layoutRows(groups, new Set(['a']), 32, 36)

    expect(rows.map((r) => [r.kind, r.top])).toEqual([
      ['group', 0],
      ['group', 32],
      ['task', 64],
    ])
    expect(height).toBe(100)
  })

  it('tanpa grup: tinggi nol', () => {
    expect(layoutRows([], new Set(), 32, 36)).toEqual({ rows: [], height: 0 })
  })
})
