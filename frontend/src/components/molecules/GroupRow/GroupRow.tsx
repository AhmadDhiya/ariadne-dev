import { Icon } from '@/components/atoms/Icon'
import { cx } from '@/lib/cx'
import './GroupRow.css'

export interface GroupRowProps {
  /** Nama grup, mis. "SLMS / Temuan UAT & API". */
  title: string
  /** Keterangan kecil, mis. "2 task · 3 sub-task" atau "6 task · dilipat". */
  meta: string
  collapsed: boolean
  onToggle: () => void
  /** Jumlah kolom tabel yang dilintasi baris ini. */
  colSpan: number
}

/** Baris judul grup sub-proyek di tabel task; bisa dilipat dengan klik atau keyboard. */
export function GroupRow({ title, meta, collapsed, onToggle, colSpan }: GroupRowProps) {
  return (
    <tr className="ar-grouprow">
      <td colSpan={colSpan}>
        <button
          type="button"
          className="ar-grouprow-toggle"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <span className={cx('ar-grouprow-caret', collapsed && 'is-collapsed')}>
            <Icon name="chevron-down" size={14} />
          </span>
          <span className="ar-grouprow-title">{title}</span>
          <span className="ar-grouprow-meta">{meta}</span>
        </button>
      </td>
    </tr>
  )
}
