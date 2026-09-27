import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

/** Kunci yang sama dipakai public/theme-init.js (dijalankan sebelum React, supaya tidak berkedip). */
export const THEME_STORAGE_KEY = 'ariadne.theme'

const listeners = new Set<() => void>()

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Menyimpan pilihan tema di perangkat ini. Mulai Fase 5 pilihan juga disimpan di akun;
 * penyimpanan lokal hanya kenyamanan dan boleh gagal (mode privat).
 */
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Penyimpanan diblokir: tema tetap berlaku sampai halaman ditutup.
  }
  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as Theme)
  return { theme, setTheme }
}
