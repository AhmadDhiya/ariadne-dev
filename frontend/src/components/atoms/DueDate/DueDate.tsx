import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { Icon } from '../Icon'
import './DueDate.css'

export interface DueDateProps {
  /** Tanggal yang sudah diformat, mis. "28 Sep". */
  children: ReactNode
  /** Dihitung di server: lewat tanggal selesai dan belum Done (Rutin tidak pernah terlambat). */
  overdue?: boolean
  /** Jumlah hari terlambat; menambahkan "· telat 3 hari". */
  lateBy?: number
}

/** Tanggal selesai; merah dengan ikon kalender saat terlambat. */
export function DueDate({ children, overdue, lateBy }: DueDateProps) {
  return (
    <span className={cx('ar-date', overdue && 'is-overdue')}>
      {overdue ? <Icon name="calendar" size={13} /> : null}
      {children}
      {overdue && lateBy ? <span className="ar-date-late">· telat {lateBy} hari</span> : null}
    </span>
  )
}
