import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon } from '@/components/atoms/Icon'
import { SearchField } from '@/components/molecules/SearchField'
import type { SearchPerson, SearchProject, SearchResults, SearchTask } from '@/types/api'
import './GlobalSearch.css'

export type SearchSelection =
  | { kind: 'task'; item: SearchTask }
  | { kind: 'project'; item: SearchProject }
  | { kind: 'person'; item: SearchPerson }

export interface GlobalSearchProps {
  /** Teks di kotak (terkendali, supaya pemanggil bisa menunda permintaan ke server). */
  query: string
  onQueryChange: (query: string) => void
  /** Hasil untuk kata yang sedang dicari; kosong selama belum ada. */
  results?: SearchResults
  loading?: boolean
  /** Pesan bila pencarian gagal. */
  error?: string
  onSelect: (selection: SearchSelection) => void
}

interface Option {
  id: string
  selection: SearchSelection
}

/** Tombol "/" memfokuskan kotak, kecuali saat pengguna sedang mengetik di kolom lain. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Pencarian global di topbar: task, proyek, dan orang (hanya yang boleh dilihat, disaring server). Panah memilih,
 * Enter membuka, Esc menutup, "/" memfokuskan dari mana saja.
 */
export function GlobalSearch({
  query,
  onQueryChange,
  results,
  loading,
  error,
  onSelect,
}: GlobalSearchProps) {
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const trimmed = query.trim()
  const open = focused && !dismissed && trimmed.length > 0

  const sections: { label: string; options: Option[] }[] = []
  if (results) {
    const group = (label: string, options: Option[]) => {
      if (options.length > 0) sections.push({ label, options })
    }
    group(
      'Task',
      results.tasks.map((item) => ({ id: `t-${item.id}`, selection: { kind: 'task', item } })),
    )
    group(
      'Proyek',
      results.projects.map((item) => ({
        id: `p-${item.id}`,
        selection: { kind: 'project', item },
      })),
    )
    group(
      'Orang',
      results.people.map((item) => ({ id: `o-${item.id}`, selection: { kind: 'person', item } })),
    )
  }
  const options = sections.flatMap((s) => s.options)
  const activeIndex = Math.min(active, options.length - 1)
  const optionId = (id: string) => `${baseId}-${id}`
  const activeId = open && activeIndex >= 0 ? optionId(options[activeIndex]?.id ?? '') : undefined

  function choose(option: Option) {
    setDismissed(true)
    onQueryChange('')
    onSelect(option.selection)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setDismissed(true)
      } else if (query) {
        e.preventDefault()
        onQueryChange('')
      } else {
        inputRef.current?.blur()
      }
      return
    }
    if (!open || options.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = options[activeIndex]
      if (chosen) choose(chosen)
    }
  }

  return (
    <div className="ar-gsearch">
      <SearchField
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        shortcut="/"
        width={360}
        maxLength={100}
        onValueChange={(value) => {
          onQueryChange(value)
          setDismissed(false)
          setActive(0)
        }}
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <div
          id={`${baseId}-list`}
          role="listbox"
          aria-label="Hasil pencarian"
          className="ar-gsearch-popup"
          onMouseDown={(e) => e.preventDefault()} // fokus tetap di kotak saat hasil diklik
        >
          {error ? (
            <p className="ar-gsearch-note" role="alert">
              {error}
            </p>
          ) : options.length === 0 ? (
            <p className="ar-gsearch-note" role="status">
              {loading || !results ? 'Mencari…' : `Tidak ada hasil untuk “${trimmed}”`}
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.label} role="group" aria-label={section.label}>
                <div className="ar-gsearch-section" aria-hidden>
                  {section.label}
                </div>
                {section.options.map((option) => (
                  <ResultRow
                    key={option.id}
                    id={optionId(option.id)}
                    option={option}
                    active={options[activeIndex]?.id === option.id}
                    onHover={() => setActive(options.findIndex((o) => o.id === option.id))}
                    onChoose={() => choose(option)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function ResultRow({
  id,
  option,
  active,
  onHover,
  onChoose,
}: {
  id: string
  option: Option
  active: boolean
  onHover: () => void
  onChoose: () => void
}) {
  const { selection } = option
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      className={`ar-gsearch-option${active ? ' is-active' : ''}`}
      onPointerEnter={onHover}
      onClick={onChoose}
    >
      {selection.kind === 'task' ? (
        <>
          <span className="ar-id">{selection.item.key}</span>
          <span className="ar-gsearch-text">
            <span className="ar-gsearch-title">{selection.item.title}</span>
            <span className="ar-gsearch-sub">{selection.item.path}</span>
          </span>
        </>
      ) : selection.kind === 'project' ? (
        <>
          <Icon name="folder" size={16} />
          <span className="ar-gsearch-text">
            <span className="ar-gsearch-title">{selection.item.name}</span>
            {selection.item.path !== selection.item.name ? (
              <span className="ar-gsearch-sub">{selection.item.path}</span>
            ) : null}
          </span>
        </>
      ) : (
        <>
          <Avatar name={selection.item.name} size={22} />
          <span className="ar-gsearch-text">
            <span className="ar-gsearch-title">{selection.item.name}</span>
            <span className="ar-gsearch-sub">di {selection.item.projectName}</span>
          </span>
        </>
      )}
    </div>
  )
}
