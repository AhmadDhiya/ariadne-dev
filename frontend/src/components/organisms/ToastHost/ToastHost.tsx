import { Toast } from '@/components/molecules/Toast'
import './ToastHost.css'

export interface ToastItem {
  id: number
  kind: 'success' | 'error' | 'info'
  text: string
}

export interface ToastHostProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

/** Tumpukan pesan singkat di pojok kanan bawah. Daerah "aria-live" supaya pembaca layar mengumumkannya. */
export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <div className="ar-toasthost" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} kind={t.kind} onClose={() => onDismiss(t.id)}>
          {t.text}
        </Toast>
      ))}
    </div>
  )
}
