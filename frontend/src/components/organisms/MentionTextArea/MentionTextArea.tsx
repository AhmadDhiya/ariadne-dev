import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { TextArea } from '@/components/atoms/TextArea'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { Menu } from '@/components/organisms/Menu'
import {
  activeMentionToken,
  filterCandidates,
  insertMention,
  type MentionCandidate,
} from '@/lib/mentions'
import type { ProjectRole } from '@/types/api'
import './MentionTextArea.css'

export interface MentionPerson extends MentionCandidate {
  role: ProjectRole
}

export interface MentionTextAreaProps {
  value: string
  onChange: (text: string) => void
  /** Orang yang boleh ditandai di sini (penyaringan, mis. tanpa Tamu untuk catatan Internal, dilakukan pemanggil). */
  people: readonly MentionPerson[]
  /** Nama kotak untuk pembaca layar, mis. "Tulis komentar". */
  label: string
  rows?: number
  autoFocus?: boolean
  /** Ctrl+Enter ditekan (mengirim). */
  onSubmit?: () => void
  /** Esc ditekan saat daftar @mention tidak terbuka. Tanpa ini Esc dibiarkan (mis. menutup drawer). */
  onEscape?: () => void
}

const MAX_SUGGESTIONS = 6

/**
 * Kotak teks dengan daftar @mention yang bisa dipakai dengan keyboard: ketik "@", panah memilih, Enter atau Tab
 * memasukkan "@Nama", Esc menutup daftar (tanpa menutup drawer). Orang yang ditandai dibaca dari teksnya (lib/mentions),
 * bukan dari kotak ini, jadi mengetik "@Nama" sendiri juga berlaku.
 */
export function MentionTextArea({
  value,
  onChange,
  people,
  label,
  rows = 3,
  autoFocus,
  onSubmit,
  onEscape,
}: MentionTextAreaProps) {
  const [caret, setCaret] = useState(value.length)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const id = useId()

  // Kursor dipindah setelah teks berubah karena memilih @mention (harus menunggu render)
  useEffect(() => {
    if (pendingCaret.current === null) return
    areaRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current)
    pendingCaret.current = null
  }, [value])

  const token = dismissed ? null : activeMentionToken(value, caret)
  const suggestions = token ? filterCandidates(people, token.query).slice(0, MAX_SUGGESTIONS) : []
  const popupOpen = token !== null && suggestions.length > 0
  const activeIndex = Math.min(active, suggestions.length - 1)

  function track(e: { currentTarget: HTMLTextAreaElement }) {
    setCaret(e.currentTarget.selectionStart)
  }

  function onInput(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    setCaret(e.target.selectionStart)
    setDismissed(false)
    setActive(0)
  }

  function pick(person: MentionPerson) {
    if (!token) return
    const next = insertMention(value, token, caret, person.name)
    onChange(next.text)
    setCaret(next.caret)
    pendingCaret.current = next.caret
    areaRef.current?.focus()
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault()
      onSubmit()
    } else if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
    }
  }

  return (
    <div className="ar-mentionarea">
      {popupOpen ? (
        <div className="ar-mentionarea-popup">
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
        <VisuallyHidden>{label}</VisuallyHidden>
      </label>
      <TextArea
        id={`${id}-text`}
        ref={areaRef}
        rows={rows}
        maxLength={5000}
        value={value}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={popupOpen}
        aria-autocomplete="list"
        aria-controls={popupOpen ? `${id}-list` : undefined}
        aria-activedescendant={popupOpen ? `${id}-opt-${activeIndex}` : undefined}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onKeyUp={track}
        onClick={track}
        onSelect={track}
      />
    </div>
  )
}
