import { describe, expect, it } from 'vitest'
import { isValidEmail, splitEmails } from './email'
import { initials } from './initials'
import { getPriority, isHeld, PRIORITIES, STATUSES } from './status'

describe('initials', () => {
  it('sama dengan design system', () => {
    expect(initials('Pak Budi')).toBe('PB')
    expect(initials('Wiwiet')).toBe('WI')
    expect(initials('  galih  ')).toBe('GA')
  })
})

describe('email', () => {
  it('memecah daftar email dengan berbagai pemisah', () => {
    expect(splitEmails('a@b.co, c@d.co;e@f.co\n g@h.co')).toEqual([
      'a@b.co',
      'c@d.co',
      'e@f.co',
      'g@h.co',
    ])
  })

  it('menandai format yang jelas salah', () => {
    expect(isValidEmail('tim-it@klien.example')).toBe(true)
    expect(isValidEmail('salah@')).toBe(false)
    expect(isValidEmail('tanpa-at.example')).toBe(false)
  })
})

describe('status dan prioritas', () => {
  it('status tertahan hanya Blocked, On Hold, On Request', () => {
    expect(STATUSES.filter((s) => isHeld(s.key)).map((s) => s.label)).toEqual([
      'Blocked',
      'On Hold',
      'On Request',
    ])
  })

  it('urutan prioritas: Critical paling atas', () => {
    expect([...PRIORITIES].sort((a, b) => a.rank - b.rank).map((p) => p.label)).toEqual([
      'Critical',
      'High',
      'Medium',
      'Low',
    ])
    expect(getPriority('critical').rank).toBeLessThan(getPriority('low').rank)
  })
})
