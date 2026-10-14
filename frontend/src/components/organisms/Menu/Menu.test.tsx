import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STATUSES } from '@/lib/status'
import { Menu } from './Menu'

const statusItems = STATUSES.map((s) => ({ status: s.key, selected: s.key === 'progress' }))

describe('Menu', () => {
  it('panah bawah + Enter memilih item; Esc menutup', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <Menu
        title="Ubah status"
        items={statusItems}
        activeIndex={1}
        autoFocus
        onSelect={onSelect}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('listbox', { name: 'Ubah status' })).toHaveFocus()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith(statusItems[2], 2)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('status yang sedang dipakai ditandai aria-selected', () => {
    render(<Menu title="Ubah status" items={statusItems} />)
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('On Progress')
  })

  it('pencarian: fokus di input, sorotan diumumkan lewat aria-activedescendant', async () => {
    const user = userEvent.setup()
    const onQueryChange = vi.fn()
    const items = [
      { avatar: 'Manto', label: 'Manto', meta: 'Anggota' },
      { avatar: 'Rama', label: 'Rama', meta: 'Anggota' },
    ]
    render(
      <Menu
        items={items}
        query="ma"
        onQueryChange={onQueryChange}
        label="Tandai anggota"
        activeIndex={0}
        autoFocus
      />,
    )

    const input = screen.getByRole('combobox')
    const [first, second] = screen.getAllByRole('option')
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute('aria-activedescendant', first?.id)

    await user.keyboard('{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', second?.id)
    await user.type(input, 'n')
    expect(onQueryChange).toHaveBeenLastCalledWith('man')
  })
})
