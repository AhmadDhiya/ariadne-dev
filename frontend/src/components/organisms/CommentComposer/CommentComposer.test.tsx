import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CommentComposer, type CommentComposerProps, type ComposerPerson } from './CommentComposer'

const PEOPLE: ComposerPerson[] = [
  { id: 'manto', name: 'Manto', role: 'Anggota' },
  { id: 'rama', name: 'Rama', role: 'Anggota' },
  { id: 'budi', name: 'Pak Budi', role: 'Tamu' },
]

function setup(props: Partial<CommentComposerProps> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const user = userEvent.setup()
  render(
    <CommentComposer
      kinds={['Update', 'Comment', 'Internal']}
      people={PEOPLE}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, user }
}

const box = () => screen.getByRole('combobox')

describe('CommentComposer', () => {
  it('mulai di Komentar; ganti jenis mengubah nama kotak dan petunjuknya', async () => {
    const { user } = setup()

    expect(screen.getByRole('button', { name: 'Komentar' })).toHaveAttribute('aria-pressed', 'true')
    expect(box()).toHaveAccessibleName('Tulis komentar')
    expect(screen.getByText('Ketik @ untuk menandai anggota.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Internal' }))
    expect(box()).toHaveAccessibleName('Tulis catatan internal')
    expect(screen.getByText(/tidak oleh Tamu/)).toBeInTheDocument()
  })

  it('Tamu hanya punya Komentar: tidak ada tab Update atau Internal', () => {
    setup({ kinds: ['Comment'] })

    expect(screen.getByRole('button', { name: 'Komentar' })).toBeInTheDocument()
    expect(screen.getByText('Komentar Anda terlihat oleh tim proyek.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Internal' })).not.toBeInTheDocument()
  })

  it('Kirim mati bila kosong, mengirim jenis dan teks yang dirapikan, lalu mengosongkan kotak', async () => {
    const { onSubmit, user } = setup()
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Update' }))
    await user.type(box(), '  Runner sudah terpasang  ')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      kind: 'Update',
      body: 'Runner sudah terpasang',
      mentionUserIds: [],
    })
    expect(box()).toHaveValue('')
  })

  it('Ctrl+Enter mengirim', async () => {
    const { onSubmit, user } = setup()

    await user.type(box(), 'Mantap')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('mengetik @ma menampilkan anggota yang cocok; panah dan Enter memilih, nama masuk ke teks', async () => {
    const { onSubmit, user } = setup()

    await user.type(box(), 'Perlu persetujuan @ma')
    const list = screen.getByRole('listbox')
    expect(list).toBeInTheDocument()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringContaining('Manto'),
      expect.stringContaining('Rama'),
    ])

    await user.keyboard('{ArrowDown}{Enter}')
    expect(box()).toHaveValue('Perlu persetujuan @Rama ')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.keyboard('dulu')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      kind: 'Comment',
      body: 'Perlu persetujuan @Rama dulu',
      mentionUserIds: ['rama'],
    })
  })

  it('klik pada daftar juga memilih; Esc menutup daftar tanpa mengubah teks', async () => {
    const { user } = setup()

    await user.type(box(), '@man')
    await user.click(screen.getByRole('option', { name: /Manto/ }))
    expect(box()).toHaveValue('@Manto ')

    await user.type(box(), '@ra')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(box()).toHaveValue('@Manto @ra')
  })

  it('orang yang dipilih lalu namanya dihapus dari teks tidak ikut dikirim', async () => {
    const { onSubmit, user } = setup()

    await user.type(box(), '@man')
    await user.keyboard('{Enter}')
    await user.clear(box())
    await user.type(box(), 'tanpa tanda')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ mentionUserIds: [] })
  })

  it('catatan Internal tidak menawarkan Tamu; komentar biasa menawarkannya', async () => {
    const { user } = setup()

    await user.type(box(), '@bu')
    expect(screen.getByRole('option', { name: /Pak Budi/ })).toBeInTheDocument()
    await user.clear(box())

    await user.click(screen.getByRole('button', { name: 'Internal' }))
    await user.type(box(), '@bu')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('beralih ke Internal membuang Tamu yang sudah dipilih', async () => {
    const { onSubmit, user } = setup()

    await user.type(box(), '@pak')
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Internal' }))
    await user.click(screen.getByRole('button', { name: 'Kirim' }))

    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ kind: 'Internal', mentionUserIds: [] })
  })

  it('alamat email tidak memunculkan daftar', async () => {
    const { user } = setup()

    await user.type(box(), 'kirim ke ahmad@ma')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('bila pengiriman gagal, teks tetap ada dan pesan kesalahan tampil', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('gagal'))
    const { user } = setup({ onSubmit, error: 'Entri tidak bisa disimpan.' })

    await user.type(box(), 'Penting')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))

    expect(box()).toHaveValue('Penting')
    expect(screen.getByRole('alert')).toHaveTextContent('Entri tidak bisa disimpan.')
  })
})
