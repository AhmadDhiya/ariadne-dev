import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useModalDialog } from './useModalDialog'

function Probe({ open, onClosed }: { open: boolean; onClosed?: () => void }) {
  const { ref, visible } = useModalDialog(open, onClosed)
  return (
    <dialog ref={ref} aria-label="Uji">
      {visible ? <p>Isi dialog</p> : null}
    </dialog>
  )
}

/** jsdom tidak memuat CSS; animasi keluar ditiru dengan nama animasi pada dialog yang sedang ditutup. */
function withExitAnimation() {
  const real = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
    const style = real(el, pseudo)
    if (el instanceof HTMLDialogElement && el.dataset.closing !== undefined) {
      return { ...style, animationName: 'ar-slide-out-right' } as CSSStyleDeclaration
    }
    return style
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useModalDialog', () => {
  it('tanpa animasi: langsung tertutup dan isinya hilang', () => {
    const onClosed = vi.fn()
    const { rerender, container } = render(<Probe open onClosed={onClosed} />)
    expect(screen.getByText('Isi dialog')).toBeInTheDocument()

    rerender(<Probe open={false} onClosed={onClosed} />)
    expect(container.querySelector('dialog')?.open).toBe(false)
    expect(screen.queryByText('Isi dialog')).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('dengan animasi keluar: isi tetap tampil sampai animasinya selesai', () => {
    withExitAnimation()
    const onClosed = vi.fn()
    const { rerender, container } = render(<Probe open onClosed={onClosed} />)
    const dialog = container.querySelector('dialog') as HTMLDialogElement

    rerender(<Probe open={false} onClosed={onClosed} />)
    expect(dialog.open).toBe(true)
    expect(dialog.dataset.closing).toBe('')
    expect(screen.getByText('Isi dialog')).toBeInTheDocument()
    expect(onClosed).not.toHaveBeenCalled()

    act(() => {
      fireEvent.animationEnd(dialog)
    })
    expect(dialog.open).toBe(false)
    expect(dialog.dataset.closing).toBeUndefined()
    expect(screen.queryByText('Isi dialog')).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('tertutup juga bila animationend tidak datang', () => {
    vi.useFakeTimers()
    withExitAnimation()
    const { rerender, container } = render(<Probe open />)
    const dialog = container.querySelector('dialog') as HTMLDialogElement

    rerender(<Probe open={false} />)
    expect(dialog.open).toBe(true)
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(dialog.open).toBe(false)
    expect(screen.queryByText('Isi dialog')).toBeNull()
  })

  it('dibuka lagi di tengah animasi keluar: tetap terbuka', () => {
    vi.useFakeTimers()
    withExitAnimation()
    const { rerender, container } = render(<Probe open />)
    const dialog = container.querySelector('dialog') as HTMLDialogElement

    rerender(<Probe open={false} />)
    rerender(<Probe open />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(dialog.open).toBe(true)
    expect(dialog.dataset.closing).toBeUndefined()
    expect(screen.getByText('Isi dialog')).toBeInTheDocument()
  })
})
