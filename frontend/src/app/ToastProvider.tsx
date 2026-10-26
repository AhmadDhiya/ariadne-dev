import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastHost, type ToastItem } from '@/components/organisms/ToastHost'
import { ToastContext, type ToastApi } from '@/hooks/useToast'

/** Kesalahan tampil lebih lama daripada pesan sukses supaya sempat dibaca. */
const DURATION = { success: 4_000, info: 5_000, error: 9_000 } as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  )

  const show = useCallback(
    (kind: ToastItem['kind'], text: string) => {
      const id = nextId.current++
      setToasts((all) => [...all.slice(-3), { id, kind, text }])
      window.setTimeout(() => dismiss(id), DURATION[kind])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => show('success', text),
      error: (text) => show('error', text),
      info: (text) => show('info', text),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}
