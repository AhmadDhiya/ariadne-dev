import { Avatar } from '@/components/atoms/Avatar'
import { Button } from '@/components/atoms/Button'
import { StatusPill } from '@/components/atoms/StatusPill'
import { statusFromApi } from '@/lib/status'
import type { TaskRow } from '@/types/api'

export interface SubtaskListProps {
  subtasks: readonly TaskRow[]
  /** Membuka sub-task di drawer yang sama. */
  onOpen: (key: string) => void
  /** Hanya bila boleh menambah (Pengelola/Anggota, dan task ini sendiri bukan sub-task). */
  onAdd?: () => void
}

/** Daftar sub-task ("1/3") di drawer: ID, judul, status, dan PIC; klik judul membuka sub-task itu. */
export function SubtaskList({ subtasks, onOpen, onAdd }: SubtaskListProps) {
  const done = subtasks.filter((s) => s.status === 'Done').length
  return (
    <section className="ar-taskdrawer-section" aria-label="Sub-task">
      <div className="ar-taskdrawer-sectionhead">
        <h3>
          Sub-task{' '}
          {subtasks.length > 0 ? (
            <span className="ar-taskdrawer-count">
              {done}/{subtasks.length}
            </span>
          ) : null}
        </h3>
        {onAdd ? (
          <Button size="sm" variant="ghost" icon="plus" onClick={onAdd}>
            Tambah sub-task
          </Button>
        ) : null}
      </div>
      {subtasks.length === 0 ? <p className="ar-muted">Belum ada sub-task.</p> : null}
      {subtasks.map((s) => (
        <div key={s.id} className="ar-taskdrawer-subtask">
          <span className="ar-id">{s.key}</span>
          <button
            type="button"
            className="ar-taskdrawer-subtitle"
            title={s.title}
            onClick={() => onOpen(s.key)}
          >
            {s.title}
          </button>
          <StatusPill status={statusFromApi(s.status)} />
          {s.assignees.map((a) => (
            <Avatar key={a.id} name={a.name} size={22} />
          ))}
        </div>
      ))}
    </section>
  )
}
