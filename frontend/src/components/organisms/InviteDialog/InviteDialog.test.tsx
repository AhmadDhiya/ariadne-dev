import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InviteDialog, type InviteDialogProps } from './InviteDialog'

function setup(overrides: Partial<InviteDialogProps> = {}) {
  const props: InviteDialogProps = {
    open: true,
    onClose: vi.fn(),
    projectName: 'Sentul',
    onSubmit: vi.fn(),
    ...overrides,
  }
  render(<InviteDialog {...props} />)
  return props
}

describe('InviteDialog', () => {
  it('berjudul nama proyek dan memilih Tamu sejak awal', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Undang ke Sentul' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tamu/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Pengelola/ })).not.toBeChecked()
  })

  it('mengirim beberapa email, peran, dan pesan yang dirapikan', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.type(screen.getByLabelText('Email'), 'tim-it@klien.example, sari@klien.example ')
    await user.click(screen.getByRole('radio', { name: /Anggota/ }))
    await user.type(screen.getByLabelText(/Pesan/), '  Halo tim IT  ')
    await user.click(screen.getByRole('button', { name: 'Kirim undangan' }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      emails: ['tim-it@klien.example', 'sari@klien.example'],
      role: 'Anggota',
      message: 'Halo tim IT',
    })
  })

  it('email yang diketik tanpa koma tetap ikut terkirim', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.type(screen.getByLabelText('Email'), 'budi@klien.example')
    await user.click(screen.getByRole('button', { name: 'Kirim undangan' }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      emails: ['budi@klien.example'],
      role: 'Tamu',
      message: undefined,
    })
  })

  it('menolak kosong dan format salah tanpa memanggil server', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole('button', { name: 'Kirim undangan' }))
    expect(screen.getByText('Isi minimal satu email.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'salah@, ')
    await user.click(screen.getByRole('button', { name: 'Kirim undangan' }))
    expect(screen.getByText(/formatnya tidak valid/)).toBeInTheDocument()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('menampilkan kesalahan dari server', () => {
    setup({ fieldErrors: { emails: 'Format email tidak valid: x' }, error: 'Gagal mengirim' })
    expect(screen.getByText('Format email tidak valid: x')).toBeInTheDocument()
    expect(screen.getByText('Gagal mengirim')).toBeInTheDocument()
  })
})
