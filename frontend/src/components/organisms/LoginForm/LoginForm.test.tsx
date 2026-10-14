import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

function setup(props: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onNavigate = vi.fn()
  render(
    <LoginForm
      onSubmit={onSubmit}
      onNavigate={onNavigate}
      forgotHref="/lupa-password"
      {...props}
    />,
  )
  return { onSubmit, onNavigate }
}

describe('LoginForm', () => {
  it('mengirim email dan password; password tersembunyi dan memakai autocomplete yang benar', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup()
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    expect(password).toHaveAttribute('autocomplete', 'current-password')

    await user.type(screen.getByLabelText('Email'), 'ahmad@perusahaan.co.id')
    await user.type(password, 'rahasia-panjang-sekali')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'ahmad@perusahaan.co.id',
      password: 'rahasia-panjang-sekali',
      rememberMe: false,
    })
  })

  it('pesan gagal dari server tampil sebagai alert', () => {
    setup({ error: 'Email atau password salah.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Email atau password salah.')
  })

  it('tombol dinonaktifkan selama mengirim supaya tidak terkirim dua kali', () => {
    setup({ submitting: true })
    expect(screen.getByRole('button', { name: 'Memproses…' })).toBeDisabled()
  })

  it('tautan "Lupa password?" memakai router, bukan memuat ulang halaman', async () => {
    const user = userEvent.setup()
    const { onNavigate } = setup()
    await user.click(screen.getByRole('link', { name: 'Lupa password?' }))
    expect(onNavigate).toHaveBeenCalledWith('/lupa-password')
  })
})
