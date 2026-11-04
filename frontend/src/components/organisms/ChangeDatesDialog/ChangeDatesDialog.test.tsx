import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChangeDatesDialog, type ChangeDatesDialogProps } from './ChangeDatesDialog'

function setup(overrides: Partial<ChangeDatesDialogProps> = {}) {
  const props: ChangeDatesDialogProps = {
    open: true,
    onClose: vi.fn(),
    taskLabel: 'SEN-150 Uji beban Dispatch',
    initial: { start: '2026-09-29', end: '2026-10-01' },
    onSubmit: vi.fn(),
    ...overrides,
  }
  render(<ChangeDatesDialog {...props} />)
  return props
}

describe('ChangeDatesDialog', () => {
  it('menampilkan task dan tanggal sekarang', () => {
    setup()

    expect(screen.getByText('SEN-150 Uji beban Dispatch')).toBeInTheDocument()
    expect(screen.getByLabelText('Mulai')).toHaveValue('2026-09-29')
    expect(screen.getByLabelText('Selesai')).toHaveValue('2026-10-01')
  })

  it('mengirim tanggal yang diubah', async () => {
    const props = setup()

    fireEvent.change(screen.getByLabelText('Selesai'), { target: { value: '2026-10-05' } })
    await userEvent.click(screen.getByRole('button', { name: 'Simpan tanggal' }))

    expect(props.onSubmit).toHaveBeenCalledWith({ startDate: '2026-09-29', dueDate: '2026-10-05' })
  })

  it('tanggal yang dikosongkan dikirim sebagai null', async () => {
    const props = setup()

    fireEvent.change(screen.getByLabelText('Mulai'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Selesai'), { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: 'Simpan tanggal' }))

    expect(props.onSubmit).toHaveBeenCalledWith({ startDate: null, dueDate: null })
  })

  it('menolak selesai sebelum mulai tanpa menghubungi server', async () => {
    const props = setup({ initial: { start: '', end: '' } })

    fireEvent.change(screen.getByLabelText('Mulai'), { target: { value: '2026-10-05' } })
    fireEvent.change(screen.getByLabelText('Selesai'), { target: { value: '2026-10-01' } })
    await userEvent.click(screen.getByRole('button', { name: 'Simpan tanggal' }))

    expect(
      screen.getByText('Tanggal selesai tidak boleh sebelum tanggal mulai.'),
    ).toBeInTheDocument()
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('menampilkan pesan dari server dan mematikan tombol selama menyimpan', () => {
    setup({ error: 'Tanggal tidak masuk akal.', submitting: true })

    expect(screen.getByText('Tanggal tidak masuk akal.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan tanggal' })).toBeDisabled()
  })
})
