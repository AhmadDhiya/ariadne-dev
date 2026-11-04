import { describe, expect, it } from 'vitest'
import type { MoveCandidate } from '@/types/api'
import { joinNames, loadRange, loadSummary, rankCandidates, spanLabel } from './moveTask'

const person = (userId: string, name: string, counts: number[]): MoveCandidate => ({
  userId,
  name,
  isAssignee: false,
  counts,
  peak: Math.max(0, ...counts),
})

const candidates = [
  person('wi', 'Wiwiet', [3, 3, 3]),
  person('ga', 'Galih', [2, 1, 1]),
  person('rama', 'Rama', [1, 1, 1]),
  person('ah', 'Ahmad', [5, 4, 4]),
  person('kh', 'Khalil', [1, 0, 0]),
]

describe('rankCandidates', () => {
  it('mengurutkan dari yang paling longgar dan menandai satu yang paling longgar', () => {
    const ranked = rankCandidates(candidates, 'rama')

    expect(ranked.map((c) => c.name)).toEqual(['Khalil', 'Galih', 'Wiwiet', 'Ahmad'])
    expect(ranked.map((c) => c.loosest)).toEqual([true, false, false, false])
  })

  it('tidak menyertakan PIC yang dipindahkan', () => {
    expect(rankCandidates(candidates, 'ga').some((c) => c.userId === 'ga')).toBe(false)
  })

  it('menandai padat bila beban harian mencapai 4', () => {
    const ranked = rankCandidates(candidates, 'rama')

    expect(ranked.find((c) => c.name === 'Ahmad')?.busy).toBe(true)
    expect(ranked.find((c) => c.name === 'Wiwiet')?.busy).toBe(false)
  })

  it('seri diurutkan menurut beban tertinggi lalu nama', () => {
    const ranked = rankCandidates(
      [person('b', 'Budi', [2, 0]), person('a', 'Adi', [1, 1]), person('c', 'Cici', [1, 1])],
      'x',
    )

    expect(ranked.map((c) => c.name)).toEqual(['Adi', 'Cici', 'Budi'])
  })

  it('pencarian menyaring menurut nama tanpa membedakan huruf besar dan kecil', () => {
    expect(rankCandidates(candidates, 'rama', 'GA').map((c) => c.name)).toEqual(['Galih'])
    expect(rankCandidates(candidates, 'rama', 'zzz')).toEqual([])
  })

  it('satu-satunya calon tidak disebut paling longgar', () => {
    expect(rankCandidates([person('a', 'Adi', [1])], 'x')[0]?.loosest).toBe(false)
  })
})

describe('loadSummary', () => {
  it('menyebut rentang, nama, dan kisaran beban', () => {
    const [best] = rankCandidates(
      [person('ga', 'Galih', [2, 1, 1]), person('wi', 'Wiwiet', [3, 3, 3])],
      'x',
    )

    expect(loadSummary('2026-09-29', 3, best)).toBe(
      'Beban 3 hari (29 Sep – 1 Okt). Galih paling longgar: 1–2 task aktif per hari.',
    )
  })

  it('tidak menyebut longgar untuk yang bukan terlonggar, dan kosong tanpa pilihan', () => {
    const ranked = rankCandidates(
      [person('ga', 'Galih', [2, 1, 1]), person('wi', 'Wiwiet', [3, 3, 3])],
      'x',
    )

    expect(loadSummary('2026-09-29', 3, ranked[1])).toBe(
      'Beban 3 hari (29 Sep – 1 Okt). Wiwiet: 3 task aktif per hari.',
    )
    expect(loadSummary('2026-09-29', 3, undefined)).toBe('')
  })
})

describe('helper kecil', () => {
  it('loadRange', () => {
    expect(loadRange([])).toBeNull()
    expect(loadRange([2, 2])).toBe('2')
    expect(loadRange([0, 3, 1])).toBe('0–3')
  })

  it('spanLabel satu hari dan banyak hari', () => {
    expect(spanLabel('2026-09-29', 1)).toBe('29 Sep')
    expect(spanLabel('2026-09-29', 3)).toBe('29 Sep – 1 Okt')
  })

  it('joinNames', () => {
    expect(joinNames(['Rama'])).toBe('Rama')
    expect(joinNames(['Rama', 'Galih'])).toBe('Rama dan Galih')
    expect(joinNames(['Rama', 'Galih', 'Manto'])).toBe('Rama, Galih, dan Manto')
  })
})
