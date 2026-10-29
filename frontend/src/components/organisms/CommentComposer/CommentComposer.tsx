import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextArea } from '@/components/atoms/TextArea'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { Menu } from '@/components/organisms/Menu'
import {
  activeMentionToken,
  filterCandidates,
  insertMention,
  mentionedIn,
  type MentionCandidate,
} from '@/lib/mentions'
import type { ProjectRole } from '@/types/api'
import './CommentComposer.css'

export type ComposerKind = 'Update' | 'Comment' | 'Internal'

export interface ComposerPerson extends MentionCandidate {
  role: ProjectRole
}

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

const MAX_SUGGESTIONS = 6

/**
 * Kotak menulis di bawah drawer: Update / Komentar / Internal, dengan daftar @mention yang bisa dipakai dengan keyboard
 * (panah, Enter atau Tab memilih, Esc menutup). Catatan Internal tidak menawarkan Tamu karena Tamu tidak boleh tahu isinya.
 */
export function CommentComposer({ kinds, people, onSubmit, error }: CommentComposerProps) {
  const [kind, setKind] = useState<ComposerKind>(
    kinds.includes('Comment') ? 'Comment' : (kinds[0] ?? 'Comment'),
  )
  const [text, setText] = useState('')
  const [caret, setCaret] = useState(0)
  const [picks, setPicks] = useState<MentionCandidate[]>([])
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const id = useId()

  // Kursor dipindah setelah teks berubah karena memilih @mention (harus menunggu render)
  useEffect(() => {
    if (pendingCaret.current === null) return
    areaRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [text])

  const mentionable = kind === 'Internal' ? people.filter((p) => p.role !== 'Tamu') : people
  const token = dismissed ? null : activeMentionToken(text, caret)
  const suggestions = token
    ? filterCandidates(mentionable, token.query).slice(0, MAX_SUGGESTIONS)
    : []
  const popupOpen = token !== null && suggestions.length > 0
  const activeIndex = Math.min(active, suggestions.length - 1)
  const canSend = text.trim() !== '' && !sending

  function track(e: { currentTarget: HTMLTextAreaElement }) {
    setCaret(e.currentTarget.selectionStart)
  }

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    setCaret(e.target.selectionStart)
    setDismissed(false)
    setActive(0)
  }

  function pick(person: ComposerPerson) {
    if (!token) return
    const next = insertMention(text, token, caret, person.name)
    setPicks((list) =>
      list.some((p) => p.id === person.id) ? list : [...list, { id: person.id, name: person.name }],
    )
    setText(next.text)
    setCaret(next.caret)
    pendingCaret.current = next.caret
    areaRef.current?.focus()
  }

  async function send() {
    if (!canSend) return
    setSending(true)
    try {
      await onSubmit({ kind, body: text.trim(), mentionUserIds: mentionedIn(text, picks) })
      setText('')
      setPicks([])
      setCaret(0)
    } catch {
      // Teks dibiarkan; pesan dari server tampil lewat prop `error`
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (popupOpen) {
      const count = suggestions.length
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + count) % count)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const chosen = suggestions[activeIndex]
        if (chosen) pick(chosen)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault() // hanya menutup daftar, bukan drawer
        setDismissed(true)
        return
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void send()
    }
  }

  const option = OPTIONS[kind]

  return (
    <div className="ar-composer">
      <SegmentedControl
        label="Jenis entri"
        value={kind}
        onChange={(next) => {
          setKind(next)
          // Pilihan @mention sebelumnya bisa memuat Tamu; hapus yang tidak boleh lagi
          if (next === 'Internal') {
            const guests = new Set(people.filter((p) => p.role === 'Tamu').map((p) => p.id))
            setPicks((list) => list.filter((p) => !guests.has(p.id)))
          }
        }}
        options={kinds.map((k) => ({ value: k, label: OPTIONS[k].label, icon: OPTIONS[k].icon }))}
      />

      <div className="ar-composer-field">
        {popupOpen ? (
          <div className="ar-composer-popup">
            <Menu
              id={id}
              label="Orang yang bisa ditandai"
              query={token.query}
              queryPlaceholder="Cari anggota"
              width={240}
              activeIndex={activeIndex}
              items={suggestions.map((p) => ({ avatar: p.name, label: p.name, meta: p.role }))}
              onSelect={(_, index) => {
                const chosen = suggestions[index]
                if (chosen) pick(chosen)
              }}
            />
          </div>
        ) : null}
        <label htmlFor={`${id}-text`}>
          <VisuallyHidden>{option.field}</VisuallyHidden>
        </label>
        <TextArea
          id={`${id}-text`}
          ref={areaRef}
          rows={3}
          maxLength={5000}
          value={text}
          role="combobox"
          aria-expanded={popupOpen}
          aria-autocomplete="list"
          aria-controls={popupOpen ? `${id}-list` : undefined}
          aria-activedescendant={popupOpen ? `${id}-opt-${activeIndex}` : undefined}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onKeyUp={track}
          onClick={track}
          onSelect={track}
        />
      </div>

      {error ? (
        <p className="ar-composer-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ar-composer-foot">
        <span className="ar-composer-hint">{option.hint}</span>
        <Button variant="primary" size="sm" disabled={!canSend} onClick={() => void send()}>
          Kirim
        </Button>
      </div>
    </div>
  )
}
