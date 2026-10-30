import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TaskRow } from '@/types/api'
import { TaskTable, type TaskGroup, type TaskTableProps } from './TaskTable'

const task = (over: Partial<TaskRow>): TaskRow => ({
  id: 't',
  key: 'SEN-1',
  number: 1,
  projectId: 'p',
  parentTaskId: null,
  title: 'Judul',
  status: 'OnProgress',
  priority: 'Medium',
  assignees: [{ id: 'u', name: 'Ahmad' }],
  startDate: '2026-09-28',
  dueDate: '2026-10-02',
  durationDays: 5,
  isOverdue: false,
  lateDays: 0,
  holdReason: null,
  waitingOn: null,
  waitingOnIsPerson: false,
  waitingOnUserId: null,
  heldSince: null,
  labels: [],
  subtaskCount: 0,
  subtaskDoneCount: 0,
  lastUpdate: null,
  ...over,
})

const GROUPS: TaskGroup[] = [
  {
    id: 'g1',
    label: 'Dispatch',
    tasks: [
      task({ id: 'a', key: 'SEN-101', title: 'Pengisian server', status: 'Done' }),
      task({
        id: 'b',
        key: 'SEN-115',
        title: 'Pipeline GitLab',
        status: 'Blocked',
        holdReason: 'Firewall menutup port 443',
        lastUpdate: {
          text: 'Runner gagal konek ke staging',
          authorName: 'Wiwiet',
          createdAt: '2026-09-28T01:40:00Z',
        },
        waitingOn: 'Manto',
        waitingOnIsPerson: true,
        heldSince: '2026-09-24T01:00:00Z',
        isOverdue: true,
        lateDays: 3,
      }),
    ],
  },
  {
    id: 'g2',
    label: 'SLMS / Temuan UAT & API',
    tasks: [
      task({
        id: 'c',
        key: 'SEN-121',
        title: 'Perbaikan temuan',
        subtaskCount: 2,
        subtaskDoneCount: 1,
      }),
      task({ id: 'd', key: 'SEN-122', title: 'Validasi jam', parentTaskId: 'c' }),
      task({ id: 'e', key: 'SEN-123', title: 'Pesan error', parentTaskId: 'c' }),
    ],
  },
]

function setup(props: Partial<TaskTableProps> = {}) {
  const onChangeStatus = vi.fn()
  const onOpenTask = vi.fn()
  render(
    <TaskTable
      groups={GROUPS}
      canEdit
      today="2026-09-28"
      onChangeStatus={onChangeStatus}
      onOpenTask={onOpenTask}
      empty={<p>Belum ada task</p>}
      {...props}
    />,
  )
  return { onChangeStatus, onOpenTask }
}

describe('TaskTable', () => {
  it('menampilkan judul kolom, grup dengan jumlah task dan sub-task, dan semua baris', () => {
    setup()

    for (const header of [
      'ID',
      'Judul',
      'Prioritas',
      'Status',
      'PIC',
      'Mulai',
      'Selesai',
      'Durasi',
      'Update terakhir',
      'Label',
    ]) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /Dispatch/ })).toHaveTextContent('2 task')
    expect(screen.getByRole('button', { name: /Temuan UAT/ })).toHaveTextContent(
      '1 task · 2 sub-task',
    )
    expect(screen.getByText('Pipeline GitLab')).toBeInTheDocument()
  })

  it('melipat dan membuka grup, dan keterangannya ikut berubah', async () => {
    const user = userEvent.setup()
    setup()
    const group = screen.getByRole('button', { name: /Dispatch/ })

    await user.click(group)

    expect(screen.queryByText('Pipeline GitLab')).not.toBeInTheDocument()
    expect(group).toHaveTextContent('dilipat')
    expect(group).toHaveAttribute('aria-expanded', 'false')

    await user.click(group)
    expect(screen.getByText('Pipeline GitLab')).toBeInTheDocument()
  })

  it('melipat sub-task dari task induknya', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByText('Validasi jam')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sembunyikan sub-task SEN-121' }))

    expect(screen.queryByText('Validasi jam')).not.toBeInTheDocument()
    expect(screen.getByText('Perbaikan temuan')).toBeInTheDocument()
  })

  it('status diubah lewat menu: memilih status mengirim task dan status yang dipilih', async () => {
    const user = userEvent.setup()
    const { onChangeStatus } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah status: Done' }))
    const menu = screen.getByRole('listbox')
    await user.click(within(menu).getByRole('option', { name: 'Fixing' }))

    expect(onChangeStatus).toHaveBeenCalledTimes(1)
    expect(onChangeStatus.mock.calls[0]?.[0]).toMatchObject({ key: 'SEN-101' })
    expect(onChangeStatus.mock.calls[0]?.[1]).toBe('fixing')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument() // menu menutup
  })

  it('status bisa diubah dengan keyboard saja', async () => {
    const user = userEvent.setup()
    const { onChangeStatus } = setup()

    screen.getByRole('button', { name: 'Ubah status: Done' }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChangeStatus).toHaveBeenCalledTimes(1)
  })

  it('tanpa hak edit (Tamu) status hanya tampilan, bukan tombol, dan judul bukan tombol', () => {
    setup({ canEdit: false, onOpenTask: undefined })

    expect(screen.queryByRole('button', { name: /Ubah status/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pipeline GitLab' })).not.toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument() // status tetap terbaca
  })

  it('task tertahan punya tombol alasan; hanya task tertahan', () => {
    setup()

    expect(screen.getAllByRole('button', { name: /^Alasan / })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Alasan Blocked' })).toBeInTheDocument()
  })

  it('klik judul membuka task itu', async () => {
    const user = userEvent.setup()
    const { onOpenTask } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab' }))

    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ key: 'SEN-115' }))
  })

  it('kolom Update terakhir: teks, penulis, dan waktu (jam, Kemarin, atau tanggal)', () => {
    setup({
      groups: [
        {
          id: 'g',
          label: 'Dispatch',
          tasks: [
            task({
              id: 'x',
              key: 'SEN-1',
              lastUpdate: {
                text: 'Hari ini',
                authorName: 'Ahmad',
                createdAt: '2026-09-28T02:12:00Z',
              },
            }),
            task({
              id: 'y',
              key: 'SEN-2',
              lastUpdate: {
                text: 'Kemarin saja',
                authorName: 'Rama',
                createdAt: '2026-09-27T05:00:00Z',
              },
            }),
            task({
              id: 'z',
              key: 'SEN-3',
              lastUpdate: { text: 'Lama', authorName: 'Manto', createdAt: '2026-09-24T05:00:00Z' },
            }),
            task({ id: 'w', key: 'SEN-4' }),
          ],
        },
      ],
    })

    expect(screen.getByText('Ahmad · 09.12')).toBeInTheDocument()
    expect(screen.getByText('Rama · Kemarin')).toBeInTheDocument()
    expect(screen.getByText('Manto · 24 Sep')).toBeInTheDocument()
    expect(screen.getByText('Hari ini')).toBeInTheDocument()
  })

  it('tanpa grup menampilkan pesan kosong, bukan tabel', () => {
    setup({ groups: [] })

    expect(screen.getByText('Belum ada task')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
