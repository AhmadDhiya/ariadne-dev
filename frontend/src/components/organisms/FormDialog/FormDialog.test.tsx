import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormDialog } from './FormDialog'

const FIELDS = [
  { name: 'email', label: 'Email', kind: 'email' as const },
  { name: 'displayName', label: 'Nama' },
]

function setup(extra: Partial<Parameters<typeof FormDialog>[0]> = {}) {
  const onSubmit = vi.fn()
  const onClose = vi.fn()
  render(
    <FormDialog
      open
      onClose={onClose}
      title="Tambah pengguna"
      fields={FIELDS}
      submitLabel="Simpan"
      onSubmit={onSubmit}
      {...extra}
    />,
  )
  return { onSubmit, onClose, dialog: screen.getByRole('dialog', { name: 'Tambah pengguna' }) }
}

describe('FormDialog', () => {
  it('bidang kosong ditolak di sisi layar dan tidak dikirim', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getByText('Email wajib diisi.')).toBeInTheDocument()
    expect(within(dialog).getByText('Nama wajib diisi.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('spasi saja dianggap kosong; isian valid dikirim', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()
    await user.type(within(dialog).getByLabelText(/^Email/), 'rama@perusahaan.co.id')
    await user.type(within(dialog).getByLabelText(/^Nama/), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText(/^Nama/), 'Rama')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'rama@perusahaan.co.id',
      displayName: '   Rama',
    })
  })

  it('menampilkan pesan kolom dan pesan umum dari server', () => {
    const { dialog } = setup({
      fieldErrors: { email: 'Email ini sudah terdaftar.' },
      formError: 'Koneksi putus.',
    })
    expect(within(dialog).getByText('Email ini sudah terdaftar.')).toBeInTheDocument()
    expect(within(dialog).getByText('Koneksi putus.')).toHaveAttribute('role', 'alert')
  })

  it('isian awal terisi, dan Batal memanggil onClose', async () => {
    const user = userEvent.setup()
    const { onClose, dialog } = setup({ initialValues: { displayName: 'Wiwiet' } })
    expect(within(dialog).getByLabelText(/^Nama/)).toHaveValue('Wiwiet')
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('tidak merender apa pun saat tertutup', () => {
    render(
      <FormDialog
        open={false}
        onClose={() => {}}
        title="X"
        fields={FIELDS}
        submitLabel="Simpan"
        onSubmit={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
