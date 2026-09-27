import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './Popover.css'

export interface PopoverProps {
  open: boolean
  onClose: () => void
  /** Elemen pemicu (tombol) yang ditempeli popover. */
  anchor: ReactNode
  children: ReactNode
  placement?: 'bottom-start' | 'bottom-end'
  className?: string
}

/**
 * Wadah melayang yang menempel pada pemicunya (Menu status, @mention, dropdown filter).
 * Tertutup saat klik di luar atau Esc; Esc mengembalikan fokus ke pemicu.
 */
export function Popover({
  open,
  onClose,
  anchor,
  children,
  placement = 'bottom-start',
  className,
}: PopoverProps) {
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      onClose()
      rootRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <span ref={rootRef} className="ar-popover-anchor">
      {anchor}
      {open ? (
        <div className={cx('ar-popover', `ar-popover-${placement}`, className)}>{children}</div>
      ) : null}
    </span>
  )
}
