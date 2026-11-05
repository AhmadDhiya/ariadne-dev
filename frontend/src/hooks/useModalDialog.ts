import { useEffect, useRef, useState } from 'react'

/** Batas tunggu animasi tutup, bila `animationend` tidak datang (mis. tab di latar belakang). */
const EXIT_FALLBACK_MS = 400

/**
 * Menghubungkan prop `open` ke elemen <dialog> bawaan browser. showModal() memberi
 * fokus terkunci di dalam dialog, Esc untuk menutup, dan latar yang tidak bisa diklik.
 *
 * Saat ditutup, dialog diberi atribut `data-closing` dan baru benar-benar ditutup setelah animasi keluarnya
 * selesai (drawer bergeser keluar, dialog memudar). `visible` tetap true sampai dialog tertutup, supaya isinya
 * tidak hilang di tengah animasi. Tanpa animasi (mis. di test), dialog langsung ditutup.
 * `onClosed` dipanggil setelah dialog benar-benar tertutup (mis. untuk melepas isi yang disimpan selama animasi).
 */
export function useModalDialog(open: boolean, onClosed?: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  const onClosedRef = useRef(onClosed)
  useEffect(() => {
    onClosedRef.current = onClosed
  })

  // Saat `open` berubah menjadi false, isi tetap ditampilkan sampai <dialog> mengirim peristiwa "close"
  const [prevOpen, setPrevOpen] = useState(open)
  const [closing, setClosing] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setClosing(!open)
  }

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onClose = () => {
      setClosing(false)
      onClosedRef.current?.()
    }
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      delete dialog.dataset.closing
      dialog.removeAttribute('aria-hidden')
      if (!dialog.open) dialog.showModal()
      return
    }
    if (!dialog.open) return

    // Selama bergeser keluar, dialog sudah dianggap tertutup oleh pembaca layar
    dialog.dataset.closing = ''
    dialog.setAttribute('aria-hidden', 'true')
    const name = getComputedStyle(dialog).animationName
    const finish = () => {
      delete dialog.dataset.closing
      dialog.removeAttribute('aria-hidden')
      dialog.close()
    }
    if (!name || name === 'none') {
      finish()
      return
    }
    const onEnd = (e: AnimationEvent) => {
      if (e.target === dialog) finish()
    }
    const timer = window.setTimeout(finish, EXIT_FALLBACK_MS)
    dialog.addEventListener('animationend', onEnd)
    return () => {
      window.clearTimeout(timer)
      dialog.removeEventListener('animationend', onEnd)
    }
  }, [open])

  return { ref, visible: open || closing }
}
