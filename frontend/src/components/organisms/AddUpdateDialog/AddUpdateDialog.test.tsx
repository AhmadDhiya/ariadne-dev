import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddUpdateDialog } from './AddUpdateDialog'

function setup(props: Partial<React.ComponentProps<typeof AddUpdateDialog>> = {}) {
  const onSubmit = vi.fn()
  const onClose = vi.fn()
  render(
    <AddUpdateDialog
      open
      onClose={onClose}
      taskLabel="SEN-115 Pipeline GitLab IRS"
      onSubmit={onSubmit}
      {...props}
    />,
  )
  const dialog = screen.getByRole('dialog', { name: 'Tambah update' })
  return { dialog, onSubmit, onClose, user: userEvent.setup() }
}

describe('AddUpdateDialog', () => {
  it('menyebut task-nya dan langsung siap diketik', () => {
    const { dialog } = setup()

    expect(within(dialog).getByText('SEN-115 Pipeline GitLab IRS')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^Update/)).toHaveFocus()
  })

  it('mengirim teks yang sudah dirapikan', async () => {
    const { dialog, onSubmit, user } = setup()

    await user.type(within(dialog).getByLabelText(/^Update/), '  Runner sudah terpasang  ')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim update' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Runner sudah terpasang')
  })

  it('kosong ditolak dengan pesan dan tidak dikirim', async () => {
    const { dialog, onSubmit, user } = setup()

    await user.type(within(dialog).getByLabelText(/^Update/), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim update' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Isi update wajib diisi.')).toBeInTheDocument()
  })

  it('menampilkan pesan dari server, dan tombol mati selama mengirim', () => {
    const { dialog } = setup({ error: 'Anda tidak boleh menulis di task ini.', submitting: true })

    expect(within(dialog).getByText('Anda tidak boleh menulis di task ini.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Kirim update' })).toBeDisabled()
  })

  it('Batal menutup', async () => {
    const { dialog, onClose, user } = setup()

    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    expect(onClose).toHaveBeenCalled()
  })
})
