import { describe, expect, it } from 'vitest'
import {
  formatDateRange,
  formatDateWithYear,
  formatLongDate,
  formatShortDate,
  formatTime,
  parseDate,
} from './dates'

describe('format tanggal Indonesia', () => {
  it('tanggal pendek memakai singkatan bulan Indonesia', () => {
    expect(formatShortDate('2026-09-28')).toBe('28 Sep')
    expect(formatShortDate('2026-10-02')).toBe('2 Okt')
    expect(formatShortDate('2026-05-01')).toBe('1 Mei')
    expect(formatShortDate('2026-08-17')).toBe('17 Agu')
    expect(formatShortDate('2026-12-31')).toBe('31 Des')
  })

  it('tahun hanya ditulis bila bukan tahun berjalan', () => {
    expect(formatShortDate('2026-09-28', 2026)).toBe('28 Sep')
    expect(formatShortDate('2027-01-05', 2026)).toBe('5 Jan 2027')
  })

  it('rentang memakai tanda pisah panjang', () => {
    expect(formatDateRange('2026-09-28', '2026-10-02')).toBe('28 Sep – 2 Okt')
  })

  it('judul halaman memakai nama hari dan bulan lengkap', () => {
    expect(formatLongDate('2026-09-28')).toBe('Senin, 28 September 2026')
    expect(formatLongDate('2026-10-04')).toBe('Minggu, 4 Oktober 2026')
  })

  it('jam memakai titik dan zona Asia/Jakarta, bukan zona komputer', () => {
    expect(formatTime('2026-09-28T02:12:00Z')).toBe('09.12')
    // 17.30 UTC = 00.30 WIB keesokan harinya
    expect(formatTime('2026-09-27T17:30:00Z')).toBe('00.30')
  })

  it('tanggal dengan tahun memakai zona Asia/Jakarta (kolom Ditambahkan)', () => {
    expect(formatDateWithYear('2026-06-02T02:00:00Z')).toBe('2 Jun 2026')
    // 17.30 UTC = 00.30 WIB: sudah tanggal berikutnya di Jakarta
    expect(formatDateWithYear('2026-12-31T17:30:00Z')).toBe('1 Jan 2027')
  })

  it('tanggal tidak valid ditolak, tidak diam-diam ditampilkan', () => {
    expect(() => parseDate('28-09-2026')).toThrow()
    expect(() => parseDate('2026-02-30')).toThrow()
    expect(() => formatTime('bukan-waktu')).toThrow()
  })
})
