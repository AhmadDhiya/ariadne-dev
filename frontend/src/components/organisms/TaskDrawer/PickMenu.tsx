import { useCallback, useState, type ReactNode } from 'react'
import { Popover } from '@/components/molecules/Popover'
import type { MenuItemData } from '@/components/molecules/MenuItem'
import { Menu } from '@/components/organisms/Menu'

export interface PickMenuProps {
  /** Tombol pemicu; `open` menandai menu sedang terbuka. */
  trigger: (open: boolean, toggle: () => void) => ReactNode
  title: string
  items: MenuItemData[]
  /** Sorotan awal: biasanya pilihan yang sedang dipakai. */
  activeIndex: number
  onSelect: (index: number) => void
  width?: number
}

/** Pemicu + menu pilihan (status, prioritas, sub-proyek). Memilih menutup menu dan fokus kembali ke pemicu. */
export function PickMenu({
  trigger,
  title,
  items,
  activeIndex,
  onSelect,
  width = 200,
}: PickMenuProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <Popover open={open} onClose={close} anchor={trigger(open, () => setOpen((o) => !o))}>
      <Menu
        title={title}
        width={width}
        items={items}
        activeIndex={activeIndex}
        autoFocus
        onSelect={(_, index) => {
          close()
          onSelect(index)
        }}
        onClose={close}
      />
    </Popover>
  )
}
