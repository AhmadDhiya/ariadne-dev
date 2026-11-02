import { describe, expect, it } from 'vitest'
import { milestoneLabel, milestonePlace } from './milestones'

describe('milestoneLabel', () => {
  it('nama dan tanggal pendek, seperti mockup', () => {
    expect(milestoneLabel({ name: 'UAT SLMS', date: '2026-10-05' })).toBe('UAT SLMS · 5 Okt')
    expect(milestoneLabel({ name: 'Go-Live Sentul', date: '2026-10-30' })).toBe(
      'Go-Live Sentul · 30 Okt',
    )
  })

  it('tahun ditulis bila bukan tahun berjalan', () => {
    expect(milestoneLabel({ name: 'Rilis', date: '2027-01-05' }, 2026)).toBe('Rilis · 5 Jan 2027')
  })
})

describe('milestonePlace', () => {
  it('jalur tanpa proyek root, kosong untuk milestone di root', () => {
    expect(milestonePlace({ path: ['Sentul', 'SLMS', 'Temuan UAT & API'] })).toBe(
      'SLMS / Temuan UAT & API',
    )
    expect(milestonePlace({ path: ['Sentul'] })).toBe('')
  })
})
