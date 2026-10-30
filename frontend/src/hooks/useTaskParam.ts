import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** "SEN-115": kode proyek 2 sampai 6 huruf/angka, strip, nomor. Nilai lain di alamat diabaikan. */
const TASK_KEY = /^[A-Za-z][A-Za-z0-9]{1,5}-\d{1,9}$/

/**
 * Task yang sedang dibuka di drawer, disimpan di alamat halaman (?task=SEN-115) supaya bisa dibagikan dan
 * bertahan saat dimuat ulang. Parameter lain (mis. filter tabel) tidak disentuh.
 */
export function useTaskParam(): {
  key: string | undefined
  /** Membuka task (menambah riwayat, jadi tombol Kembali menutup atau kembali ke task sebelumnya). */
  open: (key: string) => void
  close: () => void
} {
  const [params, setParams] = useSearchParams()
  const raw = params.get('task')
  const key = raw !== null && TASK_KEY.test(raw) ? raw.toUpperCase() : undefined

  const open = useCallback(
    (next: string) =>
      setParams((current) => {
        const copy = new URLSearchParams(current)
        copy.set('task', next)
        return copy
      }),
    [setParams],
  )
  const close = useCallback(
    () =>
      setParams(
        (current) => {
          const copy = new URLSearchParams(current)
          copy.delete('task')
          return copy
        },
        { replace: true },
      ),
    [setParams],
  )
  return { key, open, close }
}
