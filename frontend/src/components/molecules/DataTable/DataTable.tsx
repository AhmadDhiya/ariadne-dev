import type { ReactNode } from 'react'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { cx } from '@/lib/cx'
import './DataTable.css'

export interface Column<T> {
  key: string
  header: string
  /** Lebar tetap (px) atau sisa ruang bila kosong. */
  width?: number
  align?: 'left' | 'right'
  /** Header tidak terlihat tetapi tetap dibaca pembaca layar (kolom tombol aksi). */
  headerHidden?: boolean
  render: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  /** Nama tabel untuk pembaca layar, mis. "Anggota Tim Sentul". */
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Ditampilkan bila `rows` kosong. */
  empty?: ReactNode
}

/**
 * Tabel data biasa: header abu-abu 36px, baris 44px, sesuai mockup Tim dan Anggota. Memakai elemen
 * <table> sungguhan supaya pembaca layar mengenali baris dan kolomnya.
 */
export function DataTable<T>({ caption, columns, rows, rowKey, empty }: DataTableProps<T>) {
  return (
    <div className="ar-tablewrap">
      <table className="ar-table">
        <caption className="ar-sr-only">{caption}</caption>
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx(c.align === 'right' && 'is-right')}>
                {c.headerHidden ? <VisuallyHidden>{c.header}</VisuallyHidden> : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} className={cx(c.align === 'right' && 'is-right')}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && empty ? <div className="ar-table-empty">{empty}</div> : null}
    </div>
  )
}
