import type { ReactNode } from 'react'
import { DueDate } from '@/components/atoms/DueDate'
import { Icon } from '@/components/atoms/Icon'
import { Label } from '@/components/atoms/Label'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import { cx } from '@/lib/cx'
import type { PriorityKey } from '@/lib/status'
import './TaskRow.css'

export interface TaskRowProps {
  /** ID tampilan, mis. "SEN-115". */
  id: string
  title: string
  /** Sub-task: menjorok dan huruf biasa. */
  subtask?: boolean
  /** "1/3": sub-task selesai dari seluruhnya. */
  subtaskSummary?: string
  /** Ada sub-task yang bisa dilipat. */
  expandable?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  /** Bila diisi, judul menjadi tombol (membuka detail task). */
  onOpen?: () => void
  priority: PriorityKey
  /** Sel status lengkap (pill, tombol alasan, menu), disusun oleh tabel supaya baris ini tidak memanggil data. */
  status: ReactNode
  assignees: string[]
  /** Tanggal yang sudah diformat ("28 Sep"), atau kosong. */
  start: string | null
  due: string | null
  overdue?: boolean
  lateDays?: number
  /** Hari kerja Senin–Jumat dari server. */
  duration: number | null
  lastUpdate?: { text: string; meta: string } | null
  labels: string[]
  /** Disorot saat menu statusnya terbuka. */
  highlighted?: boolean
}

/** Satu baris task di tabel proyek (mockup 03). Harus berada di dalam <tbody>; lebar kolom diatur tabelnya. */
export function TaskRow({
  id,
  title,
  subtask,
  subtaskSummary,
  expandable,
  expanded = true,
  onToggleExpand,
  onOpen,
  priority,
  status,
  assignees,
  start,
  due,
  overdue,
  lateDays,
  duration,
  lastUpdate,
  labels,
  highlighted,
}: TaskRowProps) {
  return (
    <tr className={cx('ar-taskrow', subtask && 'is-sub', highlighted && 'is-highlighted')}>
      <td className="ar-id">{id}</td>
      <td className="ar-taskrow-title">
        <span className="ar-taskrow-titlebox">
          {expandable ? (
            <button
              type="button"
              className={cx('ar-taskrow-expand', !expanded && 'is-collapsed')}
              aria-label={expanded ? `Sembunyikan sub-task ${id}` : `Tampilkan sub-task ${id}`}
              aria-expanded={expanded}
              onClick={onToggleExpand}
            >
              <Icon name="chevron-down" size={14} />
            </button>
          ) : null}
          {onOpen ? (
            <button type="button" className="ar-taskrow-name" title={title} onClick={onOpen}>
              {title}
            </button>
          ) : (
            <span className="ar-taskrow-name" title={title}>
              {title}
            </span>
          )}
          {subtaskSummary ? (
            <span className="ar-taskrow-count">
              <VisuallyHidden>Sub-task selesai </VisuallyHidden>
              {subtaskSummary}
            </span>
          ) : null}
        </span>
      </td>
      <td>
        <PriorityIcon priority={priority} showLabel />
      </td>
      <td className="ar-taskrow-status">
        <span className="ar-taskrow-statusbox">{status}</span>
      </td>
      <td>{assignees.length ? <AvatarStack names={assignees} size={22} /> : <Empty />}</td>
      <td className="ar-taskrow-tab">{start ?? <Empty />}</td>
      <td>
        {due ? (
          <span title={overdue && lateDays ? `Telat ${lateDays} hari` : undefined}>
            <DueDate overdue={overdue}>{due}</DueDate>
            {overdue && lateDays ? <VisuallyHidden>, telat {lateDays} hari</VisuallyHidden> : null}
          </span>
        ) : (
          <Empty />
        )}
      </td>
      <td className="ar-taskrow-num">{duration ?? <Empty />}</td>
      <td>
        {lastUpdate ? (
          <span className="ar-taskrow-update">
            <span className="ar-taskrow-update-text">{lastUpdate.text}</span>
            <span className="ar-taskrow-update-meta">{lastUpdate.meta}</span>
          </span>
        ) : (
          <Empty />
        )}
      </td>
      <td>
        <span className="ar-taskrow-labels">
          {labels.map((label) => (
            <Label key={label}>{label}</Label>
          ))}
        </span>
      </td>
    </tr>
  )
}

/** Tanda "tidak ada" yang dibaca pembaca layar sebagai "kosong", bukan sebagai garis. */
function Empty() {
  return (
    <>
      <span aria-hidden>—</span>
      <VisuallyHidden>kosong</VisuallyHidden>
    </>
  )
}
