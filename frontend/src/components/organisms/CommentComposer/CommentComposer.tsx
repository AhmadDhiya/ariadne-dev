import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { MentionTextArea, type MentionPerson } from '@/components/organisms/MentionTextArea'
import { mentionedIn, withoutGuests } from '@/lib/mentions'
import './CommentComposer.css'

export type ComposerKind = 'Update' | 'Comment' | 'Internal'

export type ComposerPerson = MentionPerson

export interface ComposerEntry {
  kind: ComposerKind
  body: string
  mentionUserIds: string[]
}

export interface CommentComposerProps {
  /** Jenis yang boleh ditulis pengguna ini: Tamu hanya Comment. */
  kinds: readonly ComposerKind[]
  /** Anggota proyek yang bisa ditandai. */
  people: readonly ComposerPerson[]
  /**
   * Mengirim entri. Bila gagal (lempar kesalahan atau tolak janji), teks tetap ada supaya tidak perlu mengetik ulang.
   */
  onSubmit: (entry: ComposerEntry) => unknown
  /** Pesan kesalahan dari server. */
  error?: string
}

const OPTIONS: Record<
  ComposerKind,
  { label: string; icon: 'update' | 'message' | 'lock'; field: string; hint: string }
> = {
  Update: {
    label: 'Update',
    icon: 'update',
    field: 'Tulis update',
    hint: 'Update terbaru tampil di kolom Update terakhir.',
  },
  Comment: {
    label: 'Komentar',
    icon: 'message',
    field: 'Tulis komentar',
    hint: 'Ketik @ untuk menandai anggota.',
  },
  Internal: {
    label: 'Internal',
    icon: 'lock',
    field: 'Tulis catatan internal',
    hint: 'Hanya terlihat oleh tim proyek, tidak oleh Tamu.',
  },
}

const GUEST_HINT = 'Komentar Anda terlihat oleh tim proyek.'

/**
 * Kotak menulis di bawah drawer: Update / Komentar / Internal, dengan daftar @mention yang bisa dipakai dengan keyboard
 * (panah, Enter atau Tab memilih, Esc menutup). Orang yang ditandai dibaca dari teks akhir, bukan dari yang pernah dipilih.
 */
export function CommentComposer({ kinds, people, onSubmit, error }: CommentComposerProps) {
  const [kind, setKind] = useState<ComposerKind>(
    kinds.includes('Comment') ? 'Comment' : (kinds[0] ?? 'Comment'),
  )
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const mentionable = kind === 'Internal' ? withoutGuests(people) : people
  const canSend = text.trim() !== '' && !sending

  async function send() {
    if (!canSend) return
    setSending(true)
    try {
      await onSubmit({ kind, body: text.trim(), mentionUserIds: mentionedIn(text, mentionable) })
      setText('')
    } catch {
      // Teks dibiarkan; pesan dari server tampil lewat prop `error`
    } finally {
      setSending(false)
    }
  }

  const option = OPTIONS[kind]
  // Tamu hanya bisa berkomentar: petunjuknya mengingatkan siapa yang membaca (mockup 09)
  const hint = kinds.length === 1 && kind === 'Comment' ? GUEST_HINT : option.hint

  return (
    <div className="ar-composer">
      <SegmentedControl
        label="Jenis entri"
        value={kind}
        onChange={setKind}
        options={kinds.map((k) => ({ value: k, label: OPTIONS[k].label, icon: OPTIONS[k].icon }))}
      />
      <MentionTextArea
        label={option.field}
        value={text}
        onChange={setText}
        people={mentionable}
        onSubmit={() => void send()}
      />
      {error ? (
        <p className="ar-composer-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ar-composer-foot">
        <span className="ar-composer-hint">{hint}</span>
        <Button variant="primary" size="sm" disabled={!canSend} onClick={() => void send()}>
          Kirim
        </Button>
      </div>
    </div>
  )
}
