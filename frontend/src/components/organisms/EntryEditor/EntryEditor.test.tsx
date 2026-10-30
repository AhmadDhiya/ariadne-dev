import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EntryEditor, type EntryEditorProps } from './EntryEditor'

const PEOPLE = [
  { id: 'mn', name: 'Manto', role: 'Anggota' as const },
  { id: 'ra', name: 'Rama', role: 'Anggota' as const },
]

function setup(props: Partial<EntryEditorProps> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(
    <EntryEditor
      initialText="@Manto tolong cek"
      people={PEOPLE}
      label="Ubah komentar"
      onSave={onSave}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onSave, onCancel, user }
}

const box = () => screen.getByRole('combobox', { name: 'Ubah komentar' })

describe('EntryEditor', () => {
  it('terisi teks lama dan langsung siap diketik', () => {
    setup()

    expect(box()).toHaveValue('@Manto tolong cek')
    expect(box()).toHaveFocus()
  })

  it('Simpan mengirim teks baru dan orang yang ditandai dibaca dari teksnya, bukan dari teks lama', async () => {
    const { onSave, user } = setup()

    await user.clear(box())
    await user.type(box(), '  Tolong dicek @Rama ya  ')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith('Tolong dicek @Rama ya', ['ra'])
  })

  it('tanpa menyentuh teks, orang yang sudah ditandai tetap terkirim', async () => {
    const { onSave, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith('@Manto tolong cek', ['mn'])
  })

  it('daftar @mention bekerja di dalam editor, dan Esc menutup daftar dulu, baru membatalkan', async () => {
    const { onCancel, user } = setup({ initialText: '' })

    await user.type(box(), '@ra')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('kosong tidak bisa disimpan; Ctrl+Enter menyimpan; Batal membuang', async () => {
    const { onSave, onCancel, user } = setup()

    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onSave).toHaveBeenCalledOnce()

    await user.clear(box())
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Batal' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('bila server menolak, teks tetap ada dan pesannya tampil', async () => {
    const { user } = setup({
      onSave: vi.fn().mockRejectedValue(new Error('ditolak')),
      error: 'Entri tidak bisa disimpan.',
    })

    await user.type(box(), ' lagi')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(box()).toHaveValue('@Manto tolong cek lagi')
    expect(screen.getByRole('alert')).toHaveTextContent('Entri tidak bisa disimpan.')
  })
})
