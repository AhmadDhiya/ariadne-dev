import { useRef, useState } from 'react'
import { IconButton } from '@/components/atoms/IconButton'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { cx } from '@/lib/cx'
import { isValidEmail, splitEmails } from '@/lib/email'
import './EmailChipsInput.css'

export interface EmailChipsInputProps {
  id?: string
  value: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  invalid?: boolean
  'aria-describedby'?: string
}

/**
 * Input banyak email; dipisah koma, titik koma, spasi, atau Enter.
 * Pemeriksaan format di sini hanya bantuan; server tetap memvalidasi (pedoman C3).
 */
export function EmailChipsInput({
  id,
  value,
  onChange,
  placeholder = 'Tambah email lain',
  invalid,
  'aria-describedby': describedBy,
}: EmailChipsInputProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(text: string) {
    const parts = splitEmails(text)
    if (parts.length === 0) return
    const next = [...value]
    for (const email of parts) {
      if (!next.some((e) => e.toLowerCase() === email.toLowerCase())) next.push(email)
    }
    onChange(next)
    setDraft('')
  }

  function remove(email: string) {
    onChange(value.filter((e) => e !== email))
    inputRef.current?.focus()
  }

  return (
    <div
      className={cx('ar-chips', invalid && 'is-invalid')}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((email) => {
        const valid = isValidEmail(email)
        return (
          <span key={email} className={cx('ar-chipitem', !valid && 'is-invalid')}>
            {email}
            {valid ? null : <VisuallyHidden> (format email tidak valid)</VisuallyHidden>}
            <IconButton
              icon="x"
              size="sm"
              label={`Hapus ${email}`}
              className="ar-chipitem-remove"
              onClick={(e) => {
                e.stopPropagation()
                remove(email)
              }}
            />
          </span>
        )
      })}
      <input
        ref={inputRef}
        id={id}
        type="email"
        multiple
        className="ar-chips-input"
        value={draft}
        placeholder={value.length ? placeholder : 'nama@perusahaan.co.id'}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const text = e.target.value
          if (/[\s,;]$/.test(text)) commit(text)
          else setDraft(text)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => commit(draft)}
        onPaste={(e) => {
          e.preventDefault()
          commit(draft + e.clipboardData.getData('text'))
        }}
      />
    </div>
  )
}
