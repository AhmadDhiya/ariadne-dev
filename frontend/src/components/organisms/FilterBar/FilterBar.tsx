import { useCallback, useState } from 'react'
import { FilterChip } from '@/components/molecules/FilterChip'
import { Popover } from '@/components/molecules/Popover'
import { SearchField } from '@/components/molecules/SearchField'
import { Menu } from '@/components/organisms/Menu'
import {
  PRIORITY_NAMES,
  STATUSES,
  statusFromApi,
  statusToApi,
  WORK_STATUS_NAMES,
} from '@/lib/status'
import type { TaskFilters } from '@/lib/taskFilters'
import type { PriorityName, WorkStatusName } from '@/types/api'
import './FilterBar.css'

export interface FilterPerson {
  id: string
  name: string
}

export interface FilterBarProps {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
  /** Anggota proyek yang bisa jadi PIC (tanpa Tamu). */
  people: FilterPerson[]
  /** Label yang sudah dipakai di proyek ini. */
  labels: string[]
  /** Tulisan di kotak cari, mis. "Cari di proyek ini". */
  searchPlaceholder?: string
}

type Dropdown = 'pic' | 'status' | 'priority' | 'label'

const toggled = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/**
 * Filter bar proyek (mockup 03): empat dropdown pilih-banyak, tiga tombol nyala/mati, dan pencarian.
 * Semua filter digabung dengan DAN. Dropdown tetap terbuka saat memilih supaya beberapa nilai bisa dicentang berurutan.
 */
export function FilterBar({
  filters,
  onChange,
  people,
  labels,
  searchPlaceholder = 'Cari di proyek ini',
}: FilterBarProps) {
  const [open, setOpen] = useState<Dropdown | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch })
  const toggleOpen = (which: Dropdown) => setOpen((current) => (current === which ? null : which))

  const picName = (id: string) => people.find((p) => p.id === id)?.name ?? ''
  const single = (list: string[], text: (v: string) => string) =>
    list.length === 1 && list[0] !== undefined ? text(list[0]) : undefined

  function renderDropdown({
    which,
    label,
    selected,
    value,
    menu,
  }: {
    which: Dropdown
    label: string
    selected: number
    value?: string
    menu: Parameters<typeof Menu>[0]
  }) {
    return (
      <Popover
        open={open === which}
        onClose={close}
        anchor={
          <FilterChip
            label={label}
            value={value}
            count={selected > 1 ? selected : undefined}
            active={selected > 0}
            aria-expanded={open === which}
            onClick={() => toggleOpen(which)}
          />
        }
      >
        <Menu {...menu} autoFocus onClose={close} />
      </Popover>
    )
  }

  return (
    <div className="ar-filterbar" role="search" aria-label="Filter task">
      {renderDropdown({
        which: 'pic',
        label: 'PIC',
        selected: filters.pic.length,
        value: single(filters.pic, picName),
        menu: {
          title: 'Filter PIC',
          width: 220,
          items: people.map((p) => ({
            avatar: p.name,
            label: p.name,
            selected: filters.pic.includes(p.id),
          })),
          onSelect: (_item, index) => {
            const person = people[index]
            if (person) set({ pic: toggled(filters.pic, person.id) })
          },
        },
      })}
      {renderDropdown({
        which: 'status',
        label: 'Status',
        selected: filters.status.length,
        value: single(
          filters.status,
          (v) => STATUSES.find((s) => s.key === statusFromApi(v as WorkStatusName))?.label ?? v,
        ),
        menu: {
          title: 'Filter status',
          width: 200,
          items: WORK_STATUS_NAMES.map((name) => ({
            status: statusFromApi(name),
            selected: filters.status.includes(name),
          })),
          onSelect: (item) => {
            if (item.status) set({ status: toggled(filters.status, statusToApi(item.status)) })
          },
        },
      })}
      {renderDropdown({
        which: 'priority',
        label: 'Prioritas',
        selected: filters.priority.length,
        value: single(filters.priority, (v) => v),
        menu: {
          title: 'Filter prioritas',
          width: 180,
          items: PRIORITY_NAMES.map((name) => ({
            label: name,
            selected: filters.priority.includes(name),
          })),
          onSelect: (_item, index) => {
            const name: PriorityName | undefined = PRIORITY_NAMES[index]
            if (name) set({ priority: toggled(filters.priority, name) })
          },
        },
      })}
      {renderDropdown({
        which: 'label',
        label: 'Label',
        selected: filters.label.length,
        value: single(filters.label, (v) => v),
        menu: {
          title: labels.length ? 'Filter label' : 'Belum ada label',
          width: 200,
          items: labels.map((name) => ({
            label: name,
            selected: filters.label.some((l) => l.toLowerCase() === name.toLowerCase()),
          })),
          onSelect: (_item, index) => {
            const name = labels[index]
            if (!name) return
            const has = filters.label.some((l) => l.toLowerCase() === name.toLowerCase())
            set({
              label: has
                ? filters.label.filter((l) => l.toLowerCase() !== name.toLowerCase())
                : [...filters.label, name],
            })
          },
        },
      })}

      <span className="ar-filterbar-sep" aria-hidden />
      <FilterChip
        label="Terlambat"
        toggle
        active={filters.overdue}
        onClick={() => set({ overdue: !filters.overdue })}
      />
      <FilterChip
        label="Minggu ini"
        toggle
        active={filters.thisWeek}
        onClick={() => set({ thisWeek: !filters.thisWeek })}
      />
      <FilterChip
        label="Task saya"
        toggle
        active={filters.mine}
        onClick={() => set({ mine: !filters.mine })}
      />

      <span className="ar-filterbar-spacer" />
      <SearchField
        aria-label={searchPlaceholder}
        placeholder={searchPlaceholder}
        width={220}
        value={filters.q}
        onValueChange={(q) => set({ q })}
      />
    </div>
  )
}
