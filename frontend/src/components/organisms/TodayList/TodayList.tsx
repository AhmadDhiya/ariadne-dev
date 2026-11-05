import type { ReactNode } from 'react'
import { Button } from '@/components/atoms/Button'
import { DueDate } from '@/components/atoms/DueDate'
import { StatusPill } from '@/components/atoms/StatusPill'
import { TodayRow } from '@/components/molecules/TodayRow'
import { StatusSelect } from '@/components/organisms/StatusSelect'
import { dueView, GROUP_LABELS } from '@/lib/dashboard'
import { priorityFromApi, statusFromApi, type StatusKey } from '@/lib/status'
import type { DashboardGroup, TaskRow } from '@/types/api'
import './TodayList.css'

export interface TodayListProps {
  groups: readonly DashboardGroup[]
  /** Hari ini menurut server ("YYYY-MM-DD"). */
  today: string
  /** Nama kartu yang sedang menyaring daftar (mis. "Terlambat"); kosong bila tidak ada saringan. */
  cardLabel?: string
  onClearCard?: () => void
  onOpenTask: (task: TaskRow) => void
  /**
   * Status tertahan butuh alasan, jadi pilihannya diteruskan ke induk yang membuka dialog alasan. Dikosongkan saat
   * dashboard orang lain dilihat supervisor: status hanya tampil, tidak bisa diubah.
   */
  onChangeStatus?: (task: TaskRow, status: StatusKey) => void
  onAddUpdate?: (task: TaskRow) => void
  /** Aksi lain di ujung baris (mis. "Ubah tanggal" dan "Pindahkan ke…"); menggantikan "Tambah update". */
  renderActions?: (task: TaskRow) => ReactNode
  /** Judul daftar; default "Hari Ini". */
  title?: string
  /** Ditampilkan bila tidak ada task sama sekali. */
  empty: ReactNode
}

/**
 * Daftar "Hari Ini" (mockup 02): task milik saya per kelompok (Terlambat, Jatuh tempo hari ini, Sedang berjalan),
 * diurutkan menurut prioritas oleh server. Status dan "Tambah update" bisa dilakukan langsung dari baris.
 * Di layar sempit (mockup 11) tiap kelompok menjadi judul berwarna dan tiap task menjadi kartu.
 */
export function TodayList({
  groups,
  today,
  cardLabel,
  onClearCard,
  onOpenTask,
  onChangeStatus,
  onAddUpdate,
  renderActions,
  title = 'Hari Ini',
  empty,
}: TodayListProps) {
  return (
    <section className="ar-card ar-todaylist" aria-label="Hari Ini">
      <div className="ar-todaylist-head">
        <h2>{title}</h2>
        {cardLabel && onClearCard ? (
          <Button
            size="sm"
            icon="x"
            onClick={onClearCard}
            aria-label={`Hapus saringan ${cardLabel}`}
          >
            Disaring: {cardLabel}
          </Button>
        ) : (
          <span className="ar-todaylist-sort">Diurutkan: prioritas</span>
        )}
      </div>
      {groups.length === 0 ? <div className="ar-todaylist-empty">{empty}</div> : null}
      {groups.map((group) => (
        <div key={group.kind} role="group" aria-label={GROUP_LABELS[group.kind]}>
          <div className={`ar-todaylist-group${group.kind === 'Overdue' ? ' is-overdue' : ''}`}>
            <span>{GROUP_LABELS[group.kind]}</span>
            <span className="ar-todaylist-count">{group.tasks.length}</span>
          </div>
          {group.tasks.map(({ task, path }) => {
            const due = dueView(task, today)
            return (
              <TodayRow
                key={task.id}
                priority={priorityFromApi(task.priority)}
                id={task.key}
                title={task.title}
                path={path.join(' / ')}
                onOpen={() => onOpenTask(task)}
                due={
                  due.text === '—' ? (
                    <span className="ar-muted">—</span>
                  ) : (
                    <DueDate overdue={due.overdue} lateBy={due.lateDays || undefined}>
                      {due.text}
                    </DueDate>
                  )
                }
                status={
                  onChangeStatus ? (
                    <StatusSelect
                      status={statusFromApi(task.status)}
                      taskKey={task.key}
                      taskTitle={task.title}
                      onChange={(next) => onChangeStatus(task, next)}
                    />
                  ) : (
                    <StatusPill status={statusFromApi(task.status)} />
                  )
                }
                action={
                  renderActions ? (
                    renderActions(task)
                  ) : onAddUpdate ? (
                    <Button
                      size="sm"
                      icon="update"
                      aria-label={`Tambah update untuk ${task.key}`}
                      onClick={() => onAddUpdate(task)}
                    >
                      Tambah update
                    </Button>
                  ) : null
                }
              />
            )
          })}
        </div>
      ))}
    </section>
  )
}
