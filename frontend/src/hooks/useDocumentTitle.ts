import { useEffect } from 'react'

/** Judul tab browser per halaman, supaya pembaca layar dan riwayat browser tahu halaman mana yang terbuka. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — Ariadne`
  }, [title])
}
