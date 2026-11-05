import type { ReactNode } from 'react'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { cx } from '@/lib/cx'
import type { PriorityKey } from '@/lib/status'
import './TodayRow.css'

export interface TodayRowProps {
  priority: PriorityKey
  /** ID tampilan, mis. "SEN-115". */
  id: string
  title: string
  /** Jalur proyek, mis. "Sentul / SLMS / Temuan UAT & API". */
  path: string
  /** Membuka detail task; judul menjadi tombol. */
  onOpen: () => void
  /** Tenggat (komponen DueDate atau "Hari ini"). */
  due: ReactNode
  /** Pill status (dengan menu bila boleh diubah). */
  status: ReactNode
  /** Tombol "Tambah update". */
  action?: ReactNode
  /** Disorot saat salah satu menu di baris ini terbuka. */
  highlighted?: boolean
}

/**
 * Satu baris task di daftar "Hari Ini" (mockup 02): prioritas, ID, judul dan jalur proyek, tenggat, status, dan aksi.
 * Di layar sempit (mockup 11) menjadi kartu: prioritas, ID, dan tenggat di atas; judul; status dan aksi di bawah.
 */
export function TodayRow({
  priority,
  id,
  title,
  path,
  onOpen,
  due,
  status,
  action,
  highlighted,
}: TodayRowProps) {
  return (
    <div className={cx('ar-todayrow', highlighted && 'is-highlighted')}>
      <PriorityIcon priority={priority} />
      <span className="ar-id ar-todayrow-id">{id}</span>
      <div className="ar-todayrow-main">
        <button type="button" className="ar-todayrow-title" title={title} onClick={onOpen}>
          {title}
        </button>
        <span className="ar-todayrow-path" title={path}>
          {path}
        </span>
      </div>
      <div className="ar-todayrow-due">{due}</div>
      <div className="ar-todayrow-status">{status}</div>
      {action ? <div className="ar-todayrow-action">{action}</div> : null}
    </div>
  )
}
