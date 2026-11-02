import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MilestoneFormDialog, type MilestoneFormDialogProps } from './MilestoneFormDialog'

const PROJECTS = [
  { id: 'root', label: 'Sentul' },
  { id: 'slms', label: 'SLMS' },
]

function setup(props: Partial<MilestoneFormDialogProps> = {}) {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(
    <MilestoneFormDialog
      open
      onClose={vi.fn()}
      title="Tambah milestone"
      submitLabel="Tambah milestone"
      projects={PROJECTS}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return {
    dialog: screen.getByRole('dialog', { name: props.title ?? 'Tambah milestone' }),
    onSubmit,
    user,
  }
}

describe('MilestoneFormDialog', () => {
  it('nama dan tanggal wajib; kosong ditolak dengan pesan di kolomnya', async () => {
    const { dialog, onSubmit, user } = setup()

    await user.click(within(dialog).getByRole('button', { name: 'Tambah milestone' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(within(dialog).getByText('Nama wajib diisi.')).toBeInTheDocument()
    expect(within(dialog).getByText('Tanggal wajib diisi.')).toBeInTheDocument()
  })

  it('mengirim nama yang dirapikan, tanggal, dan sub-proyek yang dipilih', async () => {
    const { dialog, onSubmit, user } = setup()

    await user.type(within(dialog).getByLabelText(/^Nama/), '  UAT SLMS  ')
    await user.type(within(dialog).getByLabelText(/^Tanggal/), '2026-10-05')
    await user.selectOptions(within(dialog).getByLabelText('Sub-proyek'), 'SLMS')
    await user.click(within(dialog).getByRole('button', { name: 'Tambah milestone' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: 'UAT SLMS',
      date: '2026-10-05',
      projectId: 'slms',
      isDone: false,
    })
  })

  it('pilihan sub-proyek disembunyikan bila hanya ada satu; "Sudah selesai" hanya saat mengubah', () => {
    setup({ projects: [{ id: 'root', label: 'Sentul' }] })

    expect(screen.queryByLabelText('Sub-proyek')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Sudah selesai')).not.toBeInTheDocument()
  })

  it('saat mengubah, isian awal terisi dan bisa ditandai selesai', async () => {
    const { dialog, onSubmit, user } = setup({
      title: 'Ubah milestone',
      submitLabel: 'Simpan',
      showDone: true,
      initial: { name: 'UAT', date: '2026-10-05', projectId: 'slms' },
    })

    expect(within(dialog).getByLabelText(/^Nama/)).toHaveValue('UAT')
    await user.click(within(dialog).getByLabelText('Sudah selesai'))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: 'UAT',
      date: '2026-10-05',
      projectId: 'slms',
      isDone: true,
    })
  })

  it('menampilkan pesan dari server per kolom dan pesan umum', () => {
    const { dialog } = setup({
      fieldErrors: { date: 'Tanggal tidak masuk akal.' },
      formError: 'Gagal menyimpan.',
    })

    expect(within(dialog).getByText('Tanggal tidak masuk akal.')).toBeInTheDocument()
    expect(within(dialog).getByText('Gagal menyimpan.')).toBeInTheDocument()
  })
})
