import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

interface DemoProps {
  name: string
  /** Catatan kecil, mis. "tambahan, tidak ada di design system". */
  note?: string
  children: ReactNode
  column?: boolean
  /** Latar surface (seperti di dalam tabel/kartu) alih-alih canvas. */
  surface?: boolean
  /** Konten lebar yang bisa digulir horizontal (Gantt). */
  scroll?: boolean
}

/** Menampilkan satu komponen berdampingan dalam tema terang dan gelap. */
export function Demo({ name, note, children, column, surface, scroll }: DemoProps) {
  // ID dari useId: nama seperti "StatusPill + Popover" berisi spasi yang merusak aria-labelledby
  const headingId = useId()
  const panelClass = cx(
    'dev-panel',
    column && 'is-column',
    surface && 'is-surface',
    scroll && 'is-scroll',
  )
  return (
    <section className="dev-demo" aria-labelledby={headingId}>
      <h3 id={headingId} className="dev-demo-name">
        {name}
        {note ? <span className="dev-demo-note"> · {note}</span> : null}
      </h3>
      <div className="dev-panels">
        {(['light', 'dark'] as const).map((theme) => (
          <div
            key={theme}
            data-theme={theme}
            className={panelClass}
            // Panel yang bisa digulir harus bisa dijangkau keyboard
            tabIndex={scroll ? 0 : undefined}
            role={scroll ? 'region' : undefined}
            aria-label={
              scroll ? `${name}, tema ${theme === 'light' ? 'terang' : 'gelap'}` : undefined
            }
          >
            {children}
          </div>
        ))}
      </div>
    </section>
  )
}

export function Level({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="dev-level" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="dev-level-title">
        {title}
      </h2>
      {children}
    </section>
  )
}
