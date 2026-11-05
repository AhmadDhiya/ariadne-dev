import { useId, type CSSProperties, type ReactNode } from 'react'
import { IconButton } from '@/components/atoms/IconButton'
import { useModalDialog } from '@/hooks/useModalDialog'
import './Dialog.css'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Baris kecil di bawah judul, mis. "SEN-150 Uji beban Dispatch · 29 Sep – 1 Okt". */
  description?: ReactNode
  children: ReactNode
  /** Tombol aksi di kanan bawah ("Batal", "Pindahkan ke Galih"). */
  footer?: ReactNode
  width?: number
}

/**
 * Dialog modal ("Pindahkan ke…", "Undang ke Sentul"). Esc, tombol ×, atau klik latar menutupnya.
 * Di layar < 768px menjadi sheet dari bawah (mockup 11) yang bergeser naik.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
}: DialogProps) {
  const { ref, visible } = useModalDialog(open)
  const titleId = useId()
  const descId = useId()

  return (
    <dialog
      ref={ref}
      className="ar-dialog"
      style={{ '--dialog-width': `${width}px` } as CSSProperties}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {visible ? (
        <div className="ar-dialog-inner">
          <header className="ar-dialog-head">
            <div className="ar-dialog-heading">
              <h2 id={titleId} className="ar-dialog-title">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="ar-dialog-desc">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton icon="x" size="sm" label="Tutup" onClick={onClose} />
          </header>
          <div className="ar-dialog-body">{children}</div>
          {footer ? <footer className="ar-dialog-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  )
}
