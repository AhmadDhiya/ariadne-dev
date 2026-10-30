import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextArea } from '@/components/atoms/TextArea'
import { TextInput } from '@/components/atoms/TextInput'
import { cx } from '@/lib/cx'
import './EditableText.css'

export interface EditableTextProps {
  value: string
  /** Menyimpan nilai baru. Bila gagal (lempar kesalahan atau tolak janji), kotak tetap terbuka dan ketikan tidak hilang. */
  onSave: (next: string) => unknown
  /** Nama bidang untuk pembaca layar, mis. "Judul" atau "Keterangan". */
  label: string
  /** Tamu dan peran lain yang hanya melihat: teks biasa, tanpa tombol. */
  canEdit?: boolean
  multiline?: boolean
  /** Teks pengganti saat kosong (hanya terlihat bagi yang boleh mengubah). */
  placeholder?: string
  maxLength?: number
  /** Judul wajib terisi; keterangan boleh kosong. */
  required?: boolean
  /** Pesan kesalahan dari server untuk bidang ini. */
  error?: string
  /** Kelas tambahan untuk tampilan teks (mis. ukuran judul). */
  className?: string
}

/**
 * Teks yang diubah di tempat: klik untuk mengetik, Simpan atau Ctrl+Enter menyimpan, Batal atau Esc membuang.
 * Satu baris: Enter menyimpan. Banyak baris: Enter tetap baris baru.
 */
export function EditableText({
  value,
  onSave,
  label,
  canEdit = false,
  multiline = false,
  placeholder = 'Klik untuk menulis',
  maxLength,
  required = false,
  error,
  className,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [missing, setMissing] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const errorId = useId()
  const hintId = useId()

  function open() {
    setDraft(value)
    setMissing(false)
    setEditing(true)
  }

  function close() {
    setEditing(false)
    // Fokus kembali ke teksnya setelah kotak menutup, supaya pengguna keyboard tidak kehilangan tempat
    queueMicrotask(() => triggerRef.current?.focus())
  }

  async function save() {
    const next = draft.trim()
    if (required && next === '') {
      setMissing(true)
      return
    }
    if (next === value.trim()) {
      close()
      return
    }
    setSaving(true)
    try {
      await onSave(next)
      close()
    } catch {
      // Kotak tetap terbuka; pesan dari server tampil lewat prop `error`
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // jangan ikut menutup drawer
      close()
    } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void save()
    }
  }

  if (!editing) {
    const empty = value.trim() === ''
    if (!canEdit) {
      return <span className={cx('ar-editable-text', className)}>{value}</span>
    }
    // Nama tombol = isi teksnya (agar pembaca layar tetap membaca isinya); cara mengubahnya hanya sebagai petunjuk
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          className={cx('ar-editable-text', 'is-editable', empty && 'is-empty', className)}
          aria-describedby={hintId}
          onClick={open}
        >
          {empty ? placeholder : value}
        </button>
        <span id={hintId} hidden>
          Klik untuk mengubah {label.toLowerCase()}
        </span>
      </>
    )
  }

  const shownError = missing ? `${label} wajib diisi.` : error
  const common = {
    'aria-label': label,
    'aria-describedby': shownError ? errorId : undefined,
    value: draft,
    maxLength,
    autoFocus: true,
    invalid: Boolean(shownError),
    disabled: saving,
    onChange: (e: { target: { value: string } }) => {
      setDraft(e.target.value)
      setMissing(false)
    },
    onKeyDown,
  }

  return (
    <span className="ar-editable-box">
      {multiline ? <TextArea {...common} rows={4} /> : <TextInput {...common} />}
      {shownError ? (
        <span id={errorId} className="ar-editable-error" role="alert">
          {shownError}
        </span>
      ) : null}
      <span className="ar-editable-actions">
        <Button size="sm" variant="primary" disabled={saving} onClick={() => void save()}>
          Simpan
        </Button>
        <Button size="sm" disabled={saving} onClick={close}>
          Batal
        </Button>
      </span>
    </span>
  )
}
