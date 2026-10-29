import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskFormDialog, type TaskFormDialogProps } from './TaskFormDialog'

const PEOPLE = [
  { id: 'u1', name: 'Ahmad' },
  { id: 'u2', name: 'Rama' },
]
const PROJECTS = [
  { id: 'p1', label: 'Sentul' },
  { id: 'p2', label: 'Dispatch' },
]

function setup(props: Partial<TaskFormDialogProps> = {}) {
  const onSubmit = vi.fn()
  const onClose = vi.fn()
  render(
    <TaskFormDialog
      open
      onClose={onClose}
      title="Tambah task"
      submitLabel="Tambah task"
      projects={PROJECTS}
      people={PEOPLE}
      knownLabels={['UAT']}
      onSubmit={onSubmit}
      {...props}
    />,
  )
  return { onSubmit, onClose, dialog: screen.getByRole('dialog') }
}

describe('TaskFormDialog', () => {
  it('judul wajib diisi', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()

    await user.click(within(dialog).getByRole('button', { name: 'Tambah task' }))

    expect(within(dialog).getByText('Judul wajib diisi.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('mengirim semua isian: sub-proyek, prioritas, PIC, tanggal, dan label', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()

    await user.type(within(dialog).getByLabelText(/^Judul/), '  Pasang runner  ')
    await user.selectOptions(within(dialog).getByLabelText('Sub-proyek'), 'p2')
    await user.selectOptions(within(dialog).getByLabelText('Prioritas'), 'Critical')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Rama' }))
    await user.type(within(dialog).getByLabelText('Mulai'), '2026-09-28')
    await user.type(within(dialog).getByLabelText('Selesai'), '2026-10-02')
    await user.type(within(dialog).getByLabelText(/^Label/), 'UAT, API')
    await user.click(within(dialog).getByRole('button', { name: 'Tambah task' }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Pasang runner',
      description: '',
      priority: 'Critical',
      projectId: 'p2',
      assigneeIds: ['u2'],
      start: '2026-09-28',
      end: '2026-10-02',
      labels: 'UAT, API',
    })
  })

  it('PIC bisa dicentang lalu dicabut lagi', async () => {
    const user = userEvent.setup()
    const { onSubmit, dialog } = setup()
    await user.type(within(dialog).getByLabelText(/^Judul/), 'X')

    await user.click(within(dialog).getByRole('checkbox', { name: 'Ahmad' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Ahmad' }))
    await user.click(within(dialog).getByRole('button', { name: 'Tambah task' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ assigneeIds: [] }))
  })

  it('tanpa daftar sub-proyek (sub-task) pilihan sub-proyek disembunyikan', () => {
    const { dialog } = setup({ projects: [] })

    expect(within(dialog).queryByLabelText('Sub-proyek')).not.toBeInTheDocument()
  })

  it('isian awal terisi dari data yang diberikan', () => {
    const { dialog } = setup({
      initial: {
        title: 'Pipeline GitLab',
        priority: 'High',
        assigneeIds: ['u1'],
        labels: 'DevOps',
      },
    })

    expect(within(dialog).getByLabelText(/^Judul/)).toHaveValue('Pipeline GitLab')
    expect(within(dialog).getByLabelText('Prioritas')).toHaveValue('High')
    expect(within(dialog).getByRole('checkbox', { name: 'Ahmad' })).toBeChecked()
  })

  it('menampilkan pesan dari server per kolom dan pesan umum', () => {
    const { dialog } = setup({
      fieldErrors: {
        dueDate: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
        assigneeIds: 'PIC harus anggota aktif proyek ini.',
      },
      formError: 'Koneksi putus.',
    })

    expect(
      within(dialog).getByText('Tanggal selesai tidak boleh sebelum tanggal mulai.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('PIC harus anggota aktif proyek ini.')).toBeInTheDocument()
    expect(within(dialog).getByText('Koneksi putus.')).toBeInTheDocument()
  })
})
