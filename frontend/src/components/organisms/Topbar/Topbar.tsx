import { useCallback, useState } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon } from '@/components/atoms/Icon'
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
}

/**
 * Topbar 56px. Pencarian global (Fase 5) dan lonceng notifikasi (Fase 9) ditambahkan di fase itu:
 * kontrol yang belum berfungsi sengaja tidak ditampilkan.
 */
export function Topbar({ userName, subtitle, guest, theme, onThemeChange, onLogout }: TopbarProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <header className="ar-topbar">
      <div className="ar-topbar-spacer" />
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
            <Icon name="chevron-down" size={14} />
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
