import { Avatar } from '@/components/atoms/Avatar'
import { Icon, type IconName } from '@/components/atoms/Icon'
import { StatusPill } from '@/components/atoms/StatusPill'
import { cx } from '@/lib/cx'
import type { StatusKey } from '@/lib/status'
import './MenuItem.css'

export interface MenuItemData {
  label?: string
  status?: StatusKey
  /** Nama orang (untuk @mention dan "Pindahkan ke…"). */
  avatar?: string
  icon?: IconName
  /** Info kecil di kanan: peran ("Anggota") atau beban ("2 aktif"). */
  meta?: string
  selected?: boolean
}

export interface MenuItemProps {
  item: MenuItemData
  id?: string
  /** Sorotan keyboard. */
  active?: boolean
  onSelect?: () => void
  onHover?: () => void
}

/** Satu baris di Menu. */
export function MenuItem({ item, id, active, onSelect, onHover }: MenuItemProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={Boolean(item.selected)}
      className={cx('ar-menu-item', active && 'is-active', item.selected && 'is-selected')}
      // Fokus tetap di kotak pencarian/pemicu saat item diklik
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onPointerEnter={onHover}
    >
      {item.status ? <StatusPill status={item.status} /> : null}
      {item.avatar ? (
        <span aria-hidden={item.label ? true : undefined}>
          <Avatar name={item.avatar} size={22} />
        </span>
      ) : null}
      {item.icon ? <Icon name={item.icon} size={16} /> : null}
      {item.label ? <span className="ar-menu-label">{item.label}</span> : null}
      {item.meta ? <span className="ar-menu-meta">{item.meta}</span> : null}
      {item.selected ? <Icon name="check" size={14} className="ar-menu-check" /> : null}
    </div>
  )
}
