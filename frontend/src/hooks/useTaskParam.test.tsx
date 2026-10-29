import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useTaskParam } from './useTaskParam'

function setup(initial: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => {
      const task = useTaskParam()
      return { ...task, search: useLocation().search }
    },
    { wrapper },
  )
}

describe('useTaskParam', () => {
  it('membaca kunci task dari alamat dan menyeragamkan huruf besar', () => {
    expect(setup('/proyek/p/tabel?task=SEN-115').result.current.key).toBe('SEN-115')
    expect(setup('/proyek/p/tabel?task=sen-7').result.current.key).toBe('SEN-7')
  })

  it('tanpa parameter atau dengan nilai yang bukan kunci task: tidak ada task terbuka', () => {
    expect(setup('/proyek/p/tabel').result.current.key).toBeUndefined()
    expect(setup('/proyek/p/tabel?task=../../admin').result.current.key).toBeUndefined()
    expect(setup('/proyek/p/tabel?task=<script>').result.current.key).toBeUndefined()
    expect(setup('/proyek/p/tabel?task=').result.current.key).toBeUndefined()
  })

  it('membuka dan menutup tanpa menyentuh parameter lain', () => {
    const { result } = setup('/proyek/p/tabel?status=Blocked')

    act(() => result.current.open('SEN-115'))
    expect(result.current.key).toBe('SEN-115')
    expect(new URLSearchParams(result.current.search).get('status')).toBe('Blocked')

    act(() => result.current.close())
    expect(result.current.key).toBeUndefined()
    expect(result.current.search).toBe('?status=Blocked')
  })
})
