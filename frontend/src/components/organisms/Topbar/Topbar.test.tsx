import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Topbar } from './Topbar'

function setup(theme: 'light' | 'dark' = 'light') {
  const onThemeChange = vi.fn()
  const onLogout = vi.fn()
  render(
    <Topbar
      userName="Ahmad"
      subtitle="Supervisor · Tim Sentul"
      theme={theme}
      onThemeChange={onThemeChange}
      onLogout={onLogout}
    />,
  )
  return { onThemeChange, onLogout }
}

describe('Topbar', () => {
  it('menampilkan nama dan peran; menu akun tertutup sampai dibuka', async () => {
    const user = userEvent.setup()
    setup()
    const trigger = screen.getByRole('button', { name: 'Menu akun Ahmad' })
    expect(trigger).toHaveTextContent('Supervisor · Tim Sentul')
    expect(screen.queryByRole('option', { name: 'Keluar' })).not.toBeInTheDocument()
    await user.click(trigger)
    expect(screen.getByRole('option', { name: 'Keluar' })).toBeInTheDocument()
  })

  it('menandai tema yang sedang dipakai dan mengganti tema', async () => {
    const user = userEvent.setup()
    const { onThemeChange } = setup('light')
    await user.click(screen.getByRole('button', { name: 'Menu akun Ahmad' }))
    expect(screen.getByRole('option', { name: 'Tema terang' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(screen.getByRole('option', { name: 'Tema gelap' }))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('Keluar memanggil onLogout dan menutup menu', async () => {
    const user = userEvent.setup()
    const { onLogout } = setup()
    await user.click(screen.getByRole('button', { name: 'Menu akun Ahmad' }))
    await user.click(screen.getByRole('option', { name: 'Keluar' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('option', { name: 'Keluar' })).not.toBeInTheDocument()
  })

  it('pencarian global ditaruh di kiri bila diberikan, dan tidak ada bila belum', () => {
    const { rerender } = render(
      <Topbar
        userName="Ahmad"
        subtitle="Supervisor"
        theme="light"
        onThemeChange={() => undefined}
        onLogout={() => undefined}
        search={<input aria-label="Cari" />}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Cari' })).toBeInTheDocument()

    rerender(
      <Topbar
        userName="Ahmad"
        subtitle="Supervisor"
        theme="light"
        onThemeChange={() => undefined}
        onLogout={() => undefined}
      />,
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
