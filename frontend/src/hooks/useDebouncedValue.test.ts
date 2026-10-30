import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('nilai awal langsung dipakai; perubahan baru berlaku setelah jeda', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'a' },
    })
    expect(result.current).toBe('a')

    rerender({ value: 'ab' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(199))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ab')
  })

  it('ketikan beruntun hanya menghasilkan nilai terakhir', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: '' },
    })

    for (const value of ['p', 'pi', 'pip']) {
      rerender({ value })
      act(() => vi.advanceTimersByTime(100))
    }
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('pip')
  })
})
