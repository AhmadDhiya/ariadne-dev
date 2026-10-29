import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HoldReasonDialog, type HoldReasonDialogProps } from './HoldReasonDialog'

const PEOPLE = [
  { id: 'u1', name: 'Manto' },
  { id: 'u2', name: 'Rama' },
]

function setup(props: Partial<HoldReasonDialogProps> = {}) {
  const onSubmit = vi.fn()
  const onClose = vi.fn()
  render(
    <HoldReasonDialog
      open
      onClose={onClose}
      status="blocked"
      taskLabel="SEN-115 Pipeline GitLab IRS"
      people={PEOPLE}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, onClose, dialog: screen.getByRole('dialog') }
}

describe('HoldReasonDialog', () => {
  it('menyebut status tujuan dan task yang diubah', () => {
    const { dialog } = setup()

    expect(within(dialog).getByText('Blocked')).toBeInTheDocument()
    expect(within(dialog).getByText('SEN-115 Pipeline GitLab IRS')).toBeInTheDocument()
  })

  it('alasan wajib: kosong atau spasi saja ditolak dan tidak dikirim', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()

    await user.click(within(dialog).getByRole('button', { name: 'Simpan status' }))
    expect(within(dialog).getByText('Alasan tertahan wajib diisi.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/^Alasan tertahan/), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan status' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('mengirim alasan yang sudah dirapikan, dengan orang yang ditunggu bila dipilih', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()

    await user.type(within(dialog).getByLabelText(/^Alasan tertahan/), '  Port 443 ditutup  ')
    await user.selectOptions(within(dialog).getByLabelText(/Menunggu siapa/), 'u1')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan status' }))

    expect(onSubmit).toHaveBeenCalledWith({
      holdReason: 'Port 443 ditutup',
      waitingOnUserId: 'u1',
      waitingOnText: '',
    })
  })

  it('pihak luar bisa diketik sendiri, dan tidak dikirim sebagai orang', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()

    await user.type(within(dialog).getByLabelText(/^Alasan tertahan/), 'Akun VPN')
    await user.selectOptions(within(dialog).getByLabelText(/Menunggu siapa/), '__other')
    await user.type(within(dialog).getByLabelText('Pihak yang ditunggu'), 'Klien, tim IT')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan status' }))

    expect(onSubmit).toHaveBeenCalledWith({
      holdReason: 'Akun VPN',
      waitingOnUserId: null,
      waitingOnText: 'Klien, tim IT',
    })
  })

  it('menampilkan pesan dari server tanpa menutup dialog', () => {
    const { dialog } = setup({
      fieldErrors: { holdReason: 'Alasan terlalu panjang.' },
      formError: 'Koneksi putus.',
    })

    expect(within(dialog).getByText('Alasan terlalu panjang.')).toBeInTheDocument()
    expect(within(dialog).getByText('Koneksi putus.')).toHaveAttribute('role', 'alert')
  })

  it('Batal menutup dialog tanpa mengirim', async () => {
    const user = userEvent.setup()
    const { onSubmit, onClose, dialog } = setup()

    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    expect(onClose).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
