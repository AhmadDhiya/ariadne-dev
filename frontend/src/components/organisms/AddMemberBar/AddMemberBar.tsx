import { useId, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { TextInput } from '@/components/atoms/TextInput'
import { Menu } from '@/components/organisms/Menu'
import './AddMemberBar.css'

export interface Candidate {
  id: string
  name: string
  /** Info kecil di kanan, mis. "Supervisor · Tim Infrastruktur". */
  hint?: string | null
}

export interface RoleOption<T extends string> {
  value: T
  label: string
}

export interface AddMemberBarProps<T extends string> {
  /** Label baris, mis. "Tambah anggota". */
  label: string
  query: string
  onQueryChange: (query: string) => void
  /** Hasil pencarian (dibatasi server). */
  candidates: Candidate[]
  selected: Candidate | null
  onSelect: (candidate: Candidate | null) => void
  roles: RoleOption<T>[]
  role: T
  onRoleChange: (role: T) => void
  roleLabel: string
  onSubmit: () => void
  submitting?: boolean
  /** Pesan kesalahan dari server (mis. "Orang ini sudah menjadi anggota tim."). */
  error?: string
}

/**
 * Baris "Tambah anggota": ketik nama → pilih dari daftar → pilih peran → Tambahkan. Fokus tetap di
 * kotak ketik; daftar dikendalikan dengan panah atas/bawah, Enter, dan Esc (pola combobox ARIA).
 */
export function AddMemberBar<T extends string>({
  label,
  query,
  onQueryChange,
  candidates,
  selected,
  onSelect,
  roles,
  role,
  onRoleChange,
  roleLabel,
  onSubmit,
  submitting,
  error,
}: AddMemberBarProps<T>) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const showList = open && !selected && query.trim().length > 0
  const activeCandidate = candidates[Math.min(active, candidates.length - 1)]

  function choose(candidate: Candidate) {
    onSelect(candidate)
    onQueryChange(candidate.name)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!candidates.length) return
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(
        (a) => (Math.min(a, candidates.length - 1) + step + candidates.length) % candidates.length,
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showList && activeCandidate) choose(activeCandidate)
      else if (selected) onSubmit()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="ar-addbar">
      <div className="ar-addbar-row">
        <label className="ar-addbar-label" htmlFor={`${id}-input`}>
          {label}
        </label>
        <div className="ar-addbar-field">
          <TextInput
            id={`${id}-input`}
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={showList && activeCandidate ? `${id}-opt-${active}` : undefined}
            autoComplete="off"
            placeholder="Ketik nama atau email"
            value={query}
            onChange={(e) => {
              onSelect(null)
              onQueryChange(e.target.value)
              setActive(0)
              setOpen(true)
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setOpen(false)}
          />
          {showList ? (
            <div className="ar-addbar-menu">
              {candidates.length > 0 ? (
                <Menu
                  id={id}
                  label="Hasil pencarian orang"
                  width={320}
                  items={candidates.map((c) => ({
                    avatar: c.name,
                    label: c.name,
                    meta: c.hint ?? undefined,
                  }))}
                  activeIndex={Math.min(active, candidates.length - 1)}
                  onSelect={(_item, index) => {
                    const candidate = candidates[index]
                    if (candidate) choose(candidate)
                  }}
                />
              ) : (
                <p className="ar-addbar-none" role="status">
                  Tidak ada orang yang cocok.
                </p>
              )}
            </div>
          ) : null}
        </div>
        <Select
          aria-label={roleLabel}
          value={role}
          onChange={(e) => onRoleChange(e.target.value as T)}
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <Button variant="primary" size="sm" disabled={!selected || submitting} onClick={onSubmit}>
          Tambahkan
        </Button>
      </div>
      {error ? (
        <p className="ar-addbar-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
