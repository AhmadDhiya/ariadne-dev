import { describe, expect, it } from 'vitest'
import {
  addDays,
  barGeometry,
  dayIndex,
  ganttDays,
  layoutRows,
  rangeLabel,
  timeScale,
  weekLabel,
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

describe('timeScale', () => {
  it('zoom Hari tidak berubah: satu kolom 40 px per hari, akhir pekan diarsir', () => {
    const scale = timeScale(ganttDays('2026-09-21', 21), 'day')
    expect(scale.columns).toHaveLength(21)
    expect(scale.columns[9]).toMatchObject({ label: '30', from: 9, span: 1, left: 360, width: 40 })
    expect(scale.columns[5]?.weekend).toBe(true)
    expect(scale.width).toBe(840)
    expect(scale.x(7)).toBe(280)
  })

  it('zoom Minggu: satu kolom 112 px per pekan Senin–Minggu, judulnya rentang tanggal', () => {
    const scale = timeScale(ganttDays('2026-10-26', 35), 'week')
    expect(scale.columns.map((c) => [c.label, c.span, c.width])).toEqual([
      ['26 Okt – 1 Nov', 7, 112],
      ['2–8 Nov', 7, 112],
      ['9–15 Nov', 7, 112],
      ['16–22 Nov', 7, 112],
      ['23–29 Nov', 7, 112],
    ])
    expect(scale.columns.every((c) => !c.weekend)).toBe(true)
    // Bar tetap di tanggal sebenarnya, tidak ditarik ke awal pekan: Rabu 4 Nov = 1 pekan + 2 hari
    expect(scale.x(dayIndex('2026-10-26', '2026-11-04'))).toBe(112 + 2 * 16)
  })

  it('zoom Minggu yang dimulai di tengah pekan: kolom pertama lebih sempit', () => {
    const scale = timeScale(ganttDays('2026-09-23', 14), 'week')
    expect(scale.columns.map((c) => [c.label, c.span, c.width])).toEqual([
      ['23–27 Sep', 5, 80],
      ['28 Sep – 4 Okt', 7, 112],
      ['5–6 Okt', 2, 32],
    ])
  })

  it('zoom Bulan: satu kolom 160 px per bulan kalender dengan tahunnya, panjang bulan diperhitungkan', () => {
    const scale = timeScale(ganttDays('2027-12-01', 31 + 31 + 29 + 30), 'month')
    expect(scale.columns.map((c) => [c.label, c.span, Math.round(c.width * 100) / 100])).toEqual([
      ['Des 2027', 31, 160],
      ['Jan 2028', 31, 160],
      ['Feb 2028', 29, 160], // tahun kabisat
      ['Mar 2028', 30, 154.84], // 30 dari 31 hari Maret
    ])
    expect(scale.columns.slice(0, 3).map((c) => c.width)).toEqual([160, 160, 160])
    // Tengah Februari kabisat (hari ke-15 dari 29) jatuh tepat di tengah kolomnya
    const feb15 = dayIndex('2027-12-01', '2028-02-15')
    expect(scale.x(feb15) + scale.dayWidth(feb15) / 2).toBeCloseTo(320 + 80)
    // Task 16 Jan – 14 Feb: melewati dua bulan, lebarnya proporsional di masing-masing bulan
    const from = dayIndex('2027-12-01', '2028-01-16')
    const to = dayIndex('2027-12-01', '2028-02-14') + 1
    expect(scale.x(to) - scale.x(from)).toBeCloseTo((16 / 31) * 160 + (14 / 29) * 160)
  })

  it('Februari bukan kabisat 28 hari, tetap selebar bulan lain', () => {
    const scale = timeScale(ganttDays('2027-02-01', 28), 'month')
    expect(scale.columns).toEqual([
      { label: 'Feb 2027', from: 0, span: 28, left: 0, width: 160, weekend: false },
    ])
  })
})

describe('weekLabel', () => {
  it('pekan dalam satu bulan dan yang melewati pergantian bulan', () => {
    expect(weekLabel('2026-11-02', '2026-11-08')).toBe('2–8 Nov')
    expect(weekLabel('2026-12-28', '2027-01-03')).toBe('28 Des – 3 Jan')
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
