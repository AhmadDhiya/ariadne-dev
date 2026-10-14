import { createContext, useContext } from 'react'

export interface ToastApi {
  success: (text: string) => void
  error: (text: string) => void
  info: (text: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Menampilkan pesan singkat ("Status disimpan", "Gagal menyimpan"). Harus dipakai di dalam ToastProvider. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast dipakai di luar ToastProvider')
  return api
}
