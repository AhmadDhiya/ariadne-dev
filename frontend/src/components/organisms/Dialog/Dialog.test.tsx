import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

describe('Dialog', () => {
  it('tidak merender isi saat tertutup; Esc (cancel) memanggil onClose', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Dialog open={false} onClose={onClose} title="Pindahkan ke…">
        Isi dialog
      </Dialog>,
    )
    expect(screen.queryByText('Isi dialog')).not.toBeInTheDocument()

    rerender(
      <Dialog open onClose={onClose} title="Pindahkan ke…" description="SEN-150 Uji beban Dispatch">
        Isi dialog
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Pindahkan ke…' })
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAccessibleDescription('SEN-150 Uji beban Dispatch')

    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('tombol × menutup', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Undang ke Sentul">
        Isi
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
