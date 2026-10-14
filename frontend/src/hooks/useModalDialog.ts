import { useEffect, useRef } from 'react'

/**
 * Menghubungkan prop `open` ke elemen <dialog> bawaan browser. showModal() memberi
 * fokus terkunci di dalam dialog, Esc untuk menutup, dan latar yang tidak bisa diklik.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return ref
}
