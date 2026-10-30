import { Icon } from '@/components/atoms/Icon'
import { attentionView } from '@/lib/dashboard'
import type { AttentionItem } from '@/types/api'
import './AttentionPanel.css'

export interface AttentionPanelProps {
  items: readonly AttentionItem[]
  /** Hari ini menurut server ("YYYY-MM-DD"), dasar tulisan "Kemarin". */
  today: string
  /** Membuka task dari butir itu. */
  onOpenTask: (key: string) => void
}

/**
 * "Perlu perhatian" (mockup 02): di-mention, task baru ditugaskan, tenggat besok, dan terlambat. Sumbernya dihitung
 * server dari data yang ada; tanda "sudah dibaca" menunggu tabel notifikasi di Fase 9.
 */
export function AttentionPanel({ items, today, onOpenTask }: AttentionPanelProps) {
  return (
    <section className="ar-card ar-attention" aria-label="Perlu perhatian">
      <div className="ar-attention-head">
        <h2>Perlu perhatian</h2>
      </div>
      {items.length === 0 ? (
        <p className="ar-attention-empty">Tidak ada yang perlu perhatian saat ini.</p>
      ) : (
        <ul className="ar-attention-list">
          {items.map((item, i) => {
            const view = attentionView(item, today)
            return (
              <li key={`${item.kind}-${item.taskKey}-${item.at ?? i}`}>
                <button
                  type="button"
                  className="ar-attention-item"
                  onClick={() => onOpenTask(item.taskKey)}
                >
                  <span className={`ar-attention-icon is-${view.tone}`}>
                    <Icon name={view.icon} size={14} />
                  </span>
                  <span className="ar-attention-body">
                    <span className="ar-attention-kind">{view.label}</span>
                    <span className="ar-attention-text">
                      <b>{view.who}</b> {view.text}
                    </span>
                    {view.detail ? (
                      <span className="ar-attention-detail">{view.detail}</span>
                    ) : null}
                  </span>
                  {view.time ? <span className="ar-attention-time">{view.time}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
