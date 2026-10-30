import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusSelect } from './StatusSelect'

describe('StatusSelect', () => {
  it('memilih status baru dari menu mengirim kuncinya dan menutup menu', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusSelect status="progress" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Ubah status: On Progress' }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Fixing' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('fixing')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('memilih status yang sama tidak mengirim apa pun', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusSelect status="progress" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Ubah status: On Progress' }))
    await user.click(
      within(screen.getByRole('listbox')).getByRole('option', { name: 'On Progress' }),
    )

    expect(onChange).not.toHaveBeenCalled()
  })

  it('bisa dipakai hanya dengan keyboard', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusSelect status="not-started" onChange={onChange} />)

    screen.getByRole('button', { name: 'Ubah status: Not Started' }).focus()
    await user.keyboard('{Enter}{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('progress')
  })

  it('tanpa hak ubah hanya menampilkan status, bukan tombol', () => {
    render(<StatusSelect status="blocked" canEdit={false} onChange={vi.fn()} />)

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
