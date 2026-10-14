import { useRef, type KeyboardEvent } from 'react'
import { cx } from '@/lib/cx'
import './Tabs.css'

export interface TabsProps {
  items: (string | { label: string })[]
  active: string
  onSelect?: (label: string) => void
  /** Nama untuk pembaca layar, mis. "Tampilan proyek". */
  label?: string
}

/** Pengganti tampilan proyek: Tabel | Gantt | Milestone | Anggota. Panah kiri/kanan berpindah tab. */
export function Tabs({ items, active, onSelect, label }: TabsProps) {
  const labels = items.map((it) => (typeof it === 'string' ? it : it.label))
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + labels.length) % labels.length
    refs.current[next]?.focus()
    const nextLabel = labels[next]
    if (nextLabel !== undefined) onSelect?.(nextLabel)
  }

  return (
    <div className="ar-tabs" role="tablist" aria-label={label}>
      {labels.map((text, i) => {
        const selected = text === active
        return (
          <button
            key={text}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cx('ar-tab', selected && 'is-active')}
            onClick={() => onSelect?.(text)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
