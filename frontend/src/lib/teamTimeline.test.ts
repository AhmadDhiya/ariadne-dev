import { describe, expect, it } from 'vitest'
import { activeToday, activeTodayText, pathLabel, teamLabel } from './teamTimeline'

describe('activeToday', () => {
  const counts = [1, 2, 3, 4, 5]

  it('mengambil angka pada hari ini di dalam rentang', () => {
    expect(activeToday(counts, '2026-09-26', '2026-09-28')).toBe(3)
  })

  it('0 bila hari ini di luar rentang', () => {
    expect(activeToday(counts, '2026-09-26', '2026-09-20')).toBe(0)
    expect(activeToday(counts, '2026-09-26', '2026-10-30')).toBe(0)
  })
})

describe('teks', () => {
  it('aktif hari ini, jalur proyek, dan label tim', () => {
    expect(activeTodayText(5)).toBe('5 aktif hari ini')
    expect(pathLabel(['Sentul', 'Testing Oktober'])).toBe('Sentul / Testing Oktober')
    expect(teamLabel('Tim Sentul', 7)).toBe('Tim Sentul · 7 orang')
  })
})
