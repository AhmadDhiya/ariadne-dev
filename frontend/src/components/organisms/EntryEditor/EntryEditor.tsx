import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { MentionTextArea, type MentionPerson } from '@/components/organisms/MentionTextArea'
import { mentionedIn } from '@/lib/mentions'
import './EntryEditor.css'

export interface EntryEditorProps {
  /** Teks saat ini. */
  initialText: string
  /** Orang yang boleh ditandai (tanpa Tamu bila entrinya catatan Internal; disaring pemanggil). */
  people: readonly MentionPerson[]
  /** Nama kotak untuk pembaca layar, mis. "Ubah komentar". */
  label: string
  /** Menyimpan. Bila gagal (lempar kesalahan atau tolak janji), editor tetap terbuka dengan teks yang sama. */
  onSave: (body: string, mentionUserIds: string[]) => unknown
  onCancel: () => void
  /** Pesan kesalahan dari server. */
  error?: string
}

/** Mengubah update, komentar, atau catatan internal di tempat: Simpan atau Ctrl+Enter menyimpan, Batal atau Esc membuang. */
export function EntryEditor({
  initialText,
  people,
  label,
  onSave,
  onCancel,
  error,
}: EntryEditorProps) {
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const canSave = text.trim() !== '' && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(text.trim(), mentionedIn(text, people))
    } catch {
      // Editor tetap terbuka; pesan dari server tampil lewat prop `error`
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ar-entryeditor">
      <MentionTextArea
        autoFocus
        label={label}
        value={text}
        onChange={setText}
        people={people}
        onSubmit={() => void save()}
        onEscape={onCancel}
      />
      {error ? (
        <p className="ar-entryeditor-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ar-entryeditor-actions">
        <Button size="sm" variant="primary" disabled={!canSave} onClick={() => void save()}>
          Simpan
        </Button>
        <Button size="sm" disabled={saving} onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  )
}
