import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { MenuItem, type MenuItemData } from '@/components/molecules/MenuItem'
import './Menu.css'

export interface MenuProps {
  items: MenuItemData[]
  /** Sorotan keyboard awal. */
  activeIndex?: number
  /** Judul kecil di atas, mis. "Ubah status" atau "Pindahkan ke…". */
  title?: string
  /** Menampilkan baris pencarian. String kosong menampilkan placeholder. */
  query?: string
  /** Bila diisi, baris pencarian menjadi input yang bisa diketik (@mention, "Pindahkan ke…"). */
  onQueryChange?: (query: string) => void
  queryPlaceholder?: string
  width?: number
  /** Nama daftar untuk pembaca layar bila tidak ada `title`. */
  label?: string
  onSelect?: (item: MenuItemData, index: number) => void
  /** Esc ditekan. */
  onClose?: () => void
  autoFocus?: boolean
}

/**
 * Daftar melayang: dropdown status, autocomplete @mention, dan pemilih "Pindahkan ke…".
 * Panah atas/bawah memindah sorotan, Enter memilih, Esc menutup.
 */
export function Menu({
  items,
  activeIndex = -1,
  title,
  query,
  onQueryChange,
  queryPlaceholder = 'Cari…',
  width,
  label,
  onSelect,
  onClose,
  autoFocus,
}: MenuProps) {
  const baseId = useId()
  const listId = `${baseId}-list`
  const titleId = `${baseId}-title`
  const [active, setActive] = useState(activeIndex)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchable = onQueryChange !== undefined

  // Saat daftar menyusut (hasil pencarian), sorotan tetap di dalam daftar.
  const current = Math.min(active, items.length - 1)
  const optionId = (i: number) => `${baseId}-opt-${i}`
  const activeId = current >= 0 ? optionId(current) : undefined

  useEffect(() => {
    if (!autoFocus) return
    if (searchable) inputRef.current?.focus()
    else listRef.current?.focus()
  }, [autoFocus, searchable])

  function onKeyDown(e: KeyboardEvent) {
    const count = items.length
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (count) setActive((current + 1 + count) % count)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (count) setActive((current - 1 + count) % count)
        break
      case 'Home':
        e.preventDefault()
        if (count) setActive(0)
        break
      case 'End':
        e.preventDefault()
        if (count) setActive(count - 1)
        break
      case 'Enter': {
        const item = items[current]
        if (item) {
          e.preventDefault()
          onSelect?.(item, current)
        }
        break
      }
      case 'Escape':
        e.preventDefault()
        onClose?.()
        break
    }
  }

  return (
    <div className="ar-menu" style={width ? { width } : undefined}>
      {title ? (
        <div className="ar-menu-title" id={titleId}>
          {title}
        </div>
      ) : null}
      {query != null ? (
        searchable ? (
          <label className="ar-menu-query">
            <Icon name="search" size={14} />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label={title ?? label ?? queryPlaceholder}
              value={query}
              placeholder={queryPlaceholder}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </label>
        ) : (
          <div className="ar-menu-query">
            <Icon name="search" size={14} />
            <span>{query || <span className="ar-muted">{queryPlaceholder}</span>}</span>
          </div>
        )
      ) : null}
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={title ? undefined : label}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={searchable ? -1 : 0}
        aria-activedescendant={searchable ? undefined : activeId}
        onKeyDown={searchable ? undefined : onKeyDown}
        className="ar-menu-list"
      >
        {items.map((item, i) => (
          <MenuItem
            key={i}
            id={optionId(i)}
            item={item}
            active={i === current}
            onHover={() => setActive(i)}
            onSelect={() => onSelect?.(item, i)}
          />
        ))}
      </div>
    </div>
  )
}
