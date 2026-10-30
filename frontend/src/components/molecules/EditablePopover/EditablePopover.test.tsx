import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EditablePopover } from './EditablePopover'

describe('EditablePopover', () => {
  it('tanpa hak ubah hanya menampilkan nilai', () => {
    render(
      <EditablePopover label="PIC" display="Wiwiet, Ahmad" canEdit={false}>
        {() => <p>editor</p>}
      </EditablePopover>,
    )

    expect(screen.getByText('Wiwiet, Ahmad')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('klik tombol membuka panel, dan close dari panel menutupnya', async () => {
    const user = userEvent.setup()
    render(
      <EditablePopover label="PIC" display="Wiwiet" canEdit>
        {(close) => <button onClick={close}>Selesai</button>}
      </EditablePopover>,
    )

    const trigger = screen.getByRole('button', { name: 'Ubah PIC' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Ubah PIC' })).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Selesai' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Esc dan klik di luar menutup panel', async () => {
    const user = userEvent.setup()
    render(
      <>
        <p>di luar</p>
        <EditablePopover label="Tanggal" display="21 Sep" canEdit>
          {() => <p>editor</p>}
        </EditablePopover>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Ubah Tanggal' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ubah Tanggal' }))
    await user.click(screen.getByText('di luar'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
