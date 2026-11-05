import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AcceptInvitationForm, type AcceptInvitationFormProps } from './AcceptInvitationForm'

function setup(overrides: Partial<AcceptInvitationFormProps> = {}) {
  const props: AcceptInvitationFormProps = {
    email: 'sari@klien.example',
    projectName: 'Sentul',
    invitedBy: 'Ahmad',
    role: 'Tamu',
    message: 'Halo tim IT',
    hasAccount: false,
    onSubmit: vi.fn(),
    loginHref: '/masuk',
    onNavigate: vi.fn(),
    ...overrides,
  }
  render(<AcceptInvitationForm {...props} />)
  return props
}

describe('AcceptInvitationForm', () => {
  it('menjelaskan undangan dan mengirim nama + password', async () => {
    const user = userEvent.setup()
    const props = setup()
    expect(screen.getByRole('heading', { name: 'Bergabung ke Sentul' })).toBeInTheDocument()
    expect(screen.getByText('Halo tim IT')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nama'), '  Sari  ')
    await user.type(screen.getByLabelText('Password'), 'kalimat panjang sekali')
    await user.type(screen.getByLabelText('Ulangi password'), 'kalimat panjang sekali')
    await user.click(screen.getByRole('button', { name: 'Buat akun dan masuk' }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      displayName: 'Sari',
      password: 'kalimat panjang sekali',
    })
  })

  it('menolak nama kosong, password pendek, dan konfirmasi berbeda', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole('button', { name: 'Buat akun dan masuk' }))
    expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nama'), 'Sari')
    await user.type(screen.getByLabelText('Password'), 'pendek')
    await user.click(screen.getByRole('button', { name: 'Buat akun dan masuk' }))
    expect(screen.getByText(/minimal 12 karakter/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Password'), ' tapi sekarang panjang')
    await user.type(screen.getByLabelText('Ulangi password'), 'berbeda')
    await user.click(screen.getByRole('button', { name: 'Buat akun dan masuk' }))
    expect(screen.getByText('Konfirmasi password tidak sama.')).toBeInTheDocument()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('akun yang sudah ada cukup menerima, tanpa kolom password', async () => {
    const user = userEvent.setup()
    const props = setup({ hasAccount: true })
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Terima undangan' }))
    expect(props.onSubmit).toHaveBeenCalledWith({ displayName: '', password: '' })
  })

  it('setelah diterima oleh akun lama, mengajak ke halaman masuk', async () => {
    const user = userEvent.setup()
    const props = setup({ hasAccount: true, joined: true })
    await user.click(screen.getByRole('button', { name: 'Ke halaman masuk' }))
    expect(props.onNavigate).toHaveBeenCalledWith('/masuk')
  })
})
