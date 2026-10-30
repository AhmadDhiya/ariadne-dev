import { describe, expect, it } from 'vitest'
import { joinNames, logLine } from './activityText'

describe('joinNames', () => {
  it('menyambung nama dengan "dan"', () => {
    expect(joinNames([])).toBe('')
    expect(joinNames(['Rama'])).toBe('Rama')
    expect(joinNames(['Rama', 'Galih'])).toBe('Rama dan Galih')
    expect(joinNames(['Rama', 'Galih', 'Manto'])).toBe('Rama, Galih, dan Manto')
  })
})

describe('logLine', () => {
  it('status: dari → ke dengan nama tampilan dan ikon status tujuan', () => {
    expect(
      logLine({ logKind: 'StatusChanged', data: { from: 'OnProgress', to: 'Blocked' } }),
    ).toEqual({ text: 'mengubah status On Progress → Blocked', icon: 'status-blocked' })
    expect(
      logLine({ logKind: 'StatusChanged', data: { from: 'Blocked', to: 'NotStarted' } }),
    ).toEqual({ text: 'mengubah status Blocked → Not Started', icon: 'status-not-started' })
  })

  it('PIC: menambah, mencopot, dan mengganti', () => {
    expect(
      logLine({ logKind: 'AssigneesChanged', data: { added: ['Rama'], removed: [] } }).text,
    ).toBe('menambahkan Rama sebagai PIC')
    expect(
      logLine({ logKind: 'AssigneesChanged', data: { added: [], removed: ['Wiwiet', 'Ahmad'] } })
        .text,
    ).toBe('menghapus Wiwiet dan Ahmad dari PIC')
    expect(
      logLine({ logKind: 'AssigneesChanged', data: { added: ['Galih'], removed: ['Rama'] } }).text,
    ).toBe('mengganti PIC Rama → Galih')
  })

  it('tanggal: rentang lama → baru, dan tanggal yang dikosongkan', () => {
    expect(
      logLine({
        logKind: 'DatesChanged',
        data: {
          fromStart: '2026-09-21',
          fromDue: '2026-09-25',
          toStart: '2026-09-21',
          toDue: '2026-09-30',
        },
      }).text,
    ).toBe('mengubah tanggal 21 Sep – 25 Sep → 21 Sep – 30 Sep')
    expect(
      logLine({ logKind: 'DatesChanged', data: { fromStart: '2026-09-21', fromDue: '2026-09-25' } })
        .text,
    ).toBe('mengubah tanggal 21 Sep – 25 Sep → tanpa tanggal')
    expect(logLine({ logKind: 'DatesChanged', data: { toDue: '2026-10-02' } }).text).toBe(
      'mengubah tanggal tanpa tanggal → selesai 2 Okt',
    )
  })

  it('task dibuat dan sub-task ditambahkan', () => {
    expect(logLine({ logKind: 'TaskCreated', data: null }).text).toBe('membuat task ini')
    expect(logLine({ logKind: 'TaskCreated', data: { added: ['Rama', 'Galih'] } }).text).toBe(
      'membuat task ini dan menugaskan Rama dan Galih',
    )
    expect(
      logLine({ logKind: 'SubtaskAdded', data: { key: 'SEN-122', title: 'Validasi jam' } }).text,
    ).toBe('menambahkan sub-task SEN-122 Validasi jam')
  })
})
