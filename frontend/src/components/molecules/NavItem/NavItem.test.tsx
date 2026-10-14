import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NavItem } from './NavItem'

describe('NavItem', () => {
  it('item aktif memakai aria-current; tombol buka/tutup punya nama', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <NavItem
        label="Sentul"
        icon="folder"
        href="/proyek/sentul"
        active
        expandable
        expanded={false}
        count={12}
        onToggle={onToggle}
      />,
    )

    expect(screen.getByRole('link', { name: /Sentul/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link')).toHaveTextContent('12 task terbuka')
    await user.click(screen.getByRole('button', { name: 'Buka Sentul' }))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
