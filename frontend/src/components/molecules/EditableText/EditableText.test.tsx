import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditableText, type EditableTextProps } from './EditableText'

function setup(props: Partial<EditableTextProps> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<EditableText value="Pipeline GitLab" label="Judul" canEdit onSave={onSave} {...props} />)
  return { onSave, user: userEvent.setup() }
}

describe('EditableText', () => {
  it('tanpa hak ubah (Tamu) hanya teks, bukan tombol', () => {
    setup({ canEdit: false })

    expect(screen.getByText('Pipeline GitLab')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('klik membuka kotak, Simpan mengirim nilai yang sudah dirapikan lalu menutup', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab' }))
    const input = screen.getByRole('textbox', { name: 'Judul' })
    await user.clear(input)
    await user.type(input, '  Pipeline CI  ')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith('Pipeline CI')
    expect(await screen.findByRole('button', { name: 'Pipeline GitLab' })).toBeInTheDocument()
  })

  it('satu baris: Enter menyimpan', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab' }))
    await user.type(screen.getByRole('textbox', { name: 'Judul' }), '!{Enter}')

    expect(onSave).toHaveBeenCalledExactlyOnceWith('Pipeline GitLab!')
  })

  it('banyak baris: Enter menambah baris, Ctrl+Enter menyimpan', async () => {
    const { onSave, user } = setup({ multiline: true, label: 'Keterangan', value: '' })

    await user.click(screen.getByRole('button', { name: 'Klik untuk menulis' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Keterangan' }),
      'baris satu{Enter}baris dua',
    )
    expect(onSave).not.toHaveBeenCalled()
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onSave).toHaveBeenCalledExactlyOnceWith('baris satu\nbaris dua')
  })

  it('Esc membatalkan tanpa menyimpan dan mengembalikan teks lama', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab' }))
    await user.type(screen.getByRole('textbox', { name: 'Judul' }), ' baru')
    await user.keyboard('{Escape}')

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Pipeline GitLab' })).toHaveTextContent(
      'Pipeline GitLab',
    )
  })

  it('judul wajib: kosong ditolak dengan pesan dan tidak dikirim', async () => {
    const { onSave, user } = setup({ required: true })

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab' }))
    await user.clear(screen.getByRole('textbox', { name: 'Judul' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Judul wajib diisi.')
  })

  it('tanpa perubahan, menyimpan hanya menutup kotak', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('bila server menolak, kotak tetap terbuka dan ketikan tidak hilang', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('ditolak'))
    const user = userEvent.setup()
    render(
      <EditableText value="A" label="Judul" canEdit onSave={onSave} error="Terlalu panjang." />,
    )

    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.type(screen.getByRole('textbox', { name: 'Judul' }), 'BC')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(screen.getByRole('textbox', { name: 'Judul' })).toHaveValue('ABC')
    expect(screen.getByRole('alert')).toHaveTextContent('Terlalu panjang.')
  })

  it('nama tombol adalah isi teksnya, dan cara mengubahnya menjadi petunjuk', () => {
    setup()

    expect(
      screen.getByRole('button', {
        name: 'Pipeline GitLab',
        description: 'Klik untuk mengubah judul',
      }),
    ).toBeInTheDocument()
  })

  it('kosong tampil sebagai petunjuk bagi yang boleh mengubah', () => {
    setup({ value: '', placeholder: 'Tambahkan keterangan' })

    expect(screen.getByRole('button', { name: 'Tambahkan keterangan' })).toBeInTheDocument()
  })
})
