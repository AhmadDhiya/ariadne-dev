import { useId, type ReactNode } from 'react'
import { IconButton } from '@/components/atoms/IconButton'
import { useModalDialog } from '@/hooks/useModalDialog'
import './Drawer.css'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Nama dialog untuk pembaca layar bila `title` bukan teks polos (mis. judul yang bisa diubah di tempat). */
  ariaLabel?: string
  /** Baris kecil di atas judul, mis. "SEN-115 Sentul / Dispatch". */
  eyebrow?: ReactNode
  /** Tombol tambahan di samping × (mis. menu "…"). */
  actions?: ReactNode
  children: ReactNode
  /** Bagian bawah yang tetap terlihat saat isi digulir (kotak komentar). */
  footer?: ReactNode
}

/** Panel samping 520px dari kanan (detail task). Esc, tombol ×, atau klik latar menutupnya. */
export function Drawer({
  open,
  onClose,
  title,
  ariaLabel,
  eyebrow,
  actions,
  children,
  footer,
}: DrawerProps) {
  const ref = useModalDialog(open)
  const titleId = useId()

  return (
    <dialog
      ref={ref}
      className="ar-drawer"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {open ? (
        <div className="ar-drawer-inner">
          <header className="ar-drawer-head">
            <div className="ar-drawer-top">
              {eyebrow ? <div className="ar-drawer-eyebrow">{eyebrow}</div> : null}
              <div className="ar-drawer-actions">
                {actions}
                <IconButton icon="x" size="sm" label="Tutup" onClick={onClose} />
              </div>
            </div>
            <h2 id={titleId} className="ar-drawer-title">
              {title}
            </h2>
          </header>
          <div className="ar-drawer-body">{children}</div>
          {footer ? <footer className="ar-drawer-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  )
}
