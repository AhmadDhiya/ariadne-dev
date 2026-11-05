import { useCallback, useState, type ReactNode } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon } from '@/components/atoms/Icon'
import { IconButton } from '@/components/atoms/IconButton'
import { Logo } from '@/components/molecules/Logo'
import { Popover } from '@/components/molecules/Popover'
import { Menu } from '@/components/organisms/Menu'
import './Topbar.css'

export interface TopbarProps {
  userName: string
  /** Keterangan peran di bawah nama, mis. "Supervisor · Tim Sentul". */
  subtitle: string
  guest?: boolean
  theme: 'light' | 'dark'
  onThemeChange: (theme: 'light' | 'dark') => void
  onLogout: () => void
  /** Pencarian global (GlobalSearch), ditaruh di kiri. Kosong bila belum tersedia. */
  search?: ReactNode
  /** Lonceng notifikasi beserta panelnya, ditaruh di kiri menu akun (mockup 10). */
  notifications?: ReactNode
  /** Layar sempit (mockup 11): tombol menu di kiri yang membuka sidebar. */
  onOpenMenu?: () => void
}

/**
 * Topbar 56px: pencarian global di kiri; lonceng notifikasi dan menu akun di kanan. Di layar < 768px (mockup 11):
 * tombol menu dan logo di kiri, pencarian disembunyikan, dan menu akun hanya avatar.
 */
export function Topbar({
  userName,
  subtitle,
  guest,
  theme,
  onThemeChange,
  onLogout,
  search,
  notifications,
  onOpenMenu,
}: TopbarProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <header className="ar-topbar">
      {onOpenMenu ? (
        <span className="ar-topbar-mobile">
          <IconButton
            icon="menu"
            label="Buka menu"
            className="ar-topbar-menu"
            onClick={onOpenMenu}
          />
          <Logo size={26} subtitle={false} />
        </span>
      ) : null}
      <span className="ar-topbar-search">{search}</span>
      <div className="ar-topbar-spacer" />
      {notifications}
      <Popover
        open={open}
        onClose={close}
        placement="bottom-end"
        anchor={
          <button
            type="button"
            className="ar-topbar-user"
            aria-label={`Menu akun ${userName}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Avatar name={userName} size={32} guest={guest} />
            <span className="ar-topbar-who">
              <span className="ar-topbar-name">{userName}</span>
              <span className="ar-topbar-role">{subtitle}</span>
            </span>
            <span className="ar-topbar-chevron">
              <Icon name="chevron-down" size={14} />
            </span>
          </button>
        }
      >
        <Menu
          title="Akun"
          width={200}
          autoFocus
          items={[
            { label: 'Tema terang', selected: theme === 'light' },
            { label: 'Tema gelap', selected: theme === 'dark' },
            { label: 'Keluar' },
          ]}
          onSelect={(_item, index) => {
            close()
            if (index === 0) onThemeChange('light')
            else if (index === 1) onThemeChange('dark')
            else onLogout()
          }}
          onClose={close}
        />
      </Popover>
    </header>
  )
}
