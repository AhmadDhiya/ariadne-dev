import { describe, expect, it } from 'vitest'
import { roleSubtitle } from './roles'

const team = (name: string, role: 'Supervisor' | 'Anggota') => ({ id: name, name, role })

describe('roleSubtitle', () => {
  it('supervisor menyebut tim yang dipegangnya', () => {
    expect(
      roleSubtitle({
        isAdmin: true,
        isSupervisor: true,
        isGuestOnly: false,
        teams: [team('Tim QA', 'Supervisor'), team('Tim Sentul', 'Supervisor')],
      }),
    ).toBe('Supervisor · Tim QA')
  })

  it('anggota biasa menyebut timnya, tanpa tim hanya perannya', () => {
    expect(
      roleSubtitle({
        isAdmin: false,
        isSupervisor: false,
        isGuestOnly: false,
        teams: [team('Tim Sentul', 'Anggota')],
      }),
    ).toBe('Anggota · Tim Sentul')
    expect(
      roleSubtitle({ isAdmin: false, isSupervisor: false, isGuestOnly: false, teams: [] }),
    ).toBe('Anggota')
  })

  it('admin tanpa tim tampil sebagai Admin', () => {
    expect(
      roleSubtitle({ isAdmin: true, isSupervisor: false, isGuestOnly: false, teams: [] }),
    ).toBe('Admin')
  })

  it('tamu tampil sebagai Tamu', () => {
    expect(
      roleSubtitle({ isAdmin: false, isSupervisor: false, isGuestOnly: true, teams: [] }),
    ).toBe('Tamu')
  })
})
