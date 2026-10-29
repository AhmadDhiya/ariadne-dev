import { useCallback, useState, type ReactNode } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { Popover } from '@/components/molecules/Popover'
import './EditablePopover.css'

export interface EditablePopoverProps {
  /** Nama bidang, mis. "PIC" atau "Tanggal"; dipakai di nama tombol dan panel. */
  label: string
  /** Nilai yang ditampilkan (avatar, rentang tanggal, label). */
  display: ReactNode
  /** Tamu dan peran lain yang hanya melihat: nilai saja, tanpa tombol ubah. */
  canEdit: boolean
  /** Isi panel; memanggil `close` setelah berhasil menyimpan atau saat Batal. */
  children: (close: () => void) => ReactNode
}

/** Nilai yang diubah lewat panel kecil di bawahnya (PIC, tanggal, label). Esc atau klik di luar menutup. */
export function EditablePopover({ label, display, canEdit, children }: EditablePopoverProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  if (!canEdit) return <span className="ar-editpop-value">{display}</span>

  return (
    <Popover
      open={open}
      onClose={close}
      anchor={
        <button
          type="button"
          className="ar-editpop-trigger"
          aria-label={`Ubah ${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="ar-editpop-value">{display}</span>
          <Icon name="chevron-down" size={14} className="ar-editpop-caret" />
        </button>
      }
    >
      <div role="dialog" aria-label={`Ubah ${label}`} className="ar-editpop-panel">
        {children(close)}
      </div>
    </Popover>
  )
}
