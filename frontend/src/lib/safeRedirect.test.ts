import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safeRedirect'

describe('safeNextPath', () => {
  it('menerima jalur di dalam aplikasi, termasuk query', () => {
    expect(safeNextPath('/tim')).toBe('/tim')
    expect(safeNextPath('/proyek/123/anggota?x=1')).toBe('/proyek/123/anggota?x=1')
  })

  it.each([
    ['https://situs-jahat.example'],
    ['http://situs-jahat.example/'],
    ['//situs-jahat.example'],
    ['/\\situs-jahat.example'],
    ['javascript:alert(1)'],
    ['tim'],
    ['/tim\nLocation: x'],
    ['/\ttim'],
  ])('menolak %j', (next) => {
    expect(safeNextPath(next)).toBe('/')
  })

  it('kosong atau halaman login jatuh ke halaman utama', () => {
    expect(safeNextPath(null)).toBe('/')
    expect(safeNextPath(undefined)).toBe('/')
    expect(safeNextPath('')).toBe('/')
    expect(safeNextPath('/masuk')).toBe('/')
    expect(safeNextPath('/masuk?next=/tim')).toBe('/')
  })

  it('mengikuti nilai cadangan yang diberikan', () => {
    expect(safeNextPath('//x', '/tim')).toBe('/tim')
  })
})
