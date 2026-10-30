import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardGroup, TaskRow } from '@/types/api'
import { TodayList, type TodayListProps } from './TodayList'

const task = (over: Partial<TaskRow>): TaskRow => ({
  id: 't',
  key: 'SEN-1',
  number: 1,
  projectId: 'p',
  parentTaskId: null,
  title: 'Judul',
  status: 'OnProgress',
  priority: 'Medium',
  assignees: [],
  startDate: '2026-09-24',
  dueDate: '2026-09-30',
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

const GROUPS: DashboardGroup[] = [
  {
    kind: 'Overdue',
    tasks: [
      {
        task: task({
          id: 'a',
          key: 'SEN-115',
          title: 'Pipeline GitLab IRS',
          status: 'Blocked',
          priority: 'Critical',
          dueDate: '2026-09-25',
          isOverdue: true,
          lateDays: 3,
        }),
        path: ['Sentul', 'Dispatch'],
      },
    ],
  },
  {
    kind: 'DueToday',
    tasks: [
      {
        task: task({
          id: 'b',
          key: 'SEN-112',
          title: 'Paket PenTest whitebox',
          dueDate: '2026-09-28',
        }),
        path: ['Sentul', 'SLMS'],
      },
    ],
  },
  {
    kind: 'InProgress',
    tasks: [
      {
        task: task({ id: 'c', key: 'MDC-021', title: 'Inventaris rak & kabel' }),
        path: ['Migrasi Data Center'],
      },
    ],
  },
]

function setup(props: Partial<TodayListProps> = {}) {
  const handlers = { onOpenTask: vi.fn(), onChangeStatus: vi.fn(), onAddUpdate: vi.fn() }
  const user = userEvent.setup()
  render(
    <TodayList
      groups={GROUPS}
      today="2026-09-28"
      empty={<p>Tidak ada task hari ini</p>}
      {...handlers}
      {...props}
    />,
  )
  return { ...handlers, user }
}

describe('TodayList', () => {
  it('kelompok berurutan dengan jumlahnya, dan baris memuat tenggat serta jalur proyek', () => {
    setup()

    const names = screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))
    expect(names).toEqual(['Terlambat', 'Jatuh tempo hari ini', 'Sedang berjalan'])
    const overdue = screen.getByRole('group', { name: 'Terlambat' })
    expect(within(overdue).getByText('Sentul / Dispatch')).toBeInTheDocument()
    expect(within(overdue).getByText('25 Sep')).toBeInTheDocument()
    expect(within(overdue).getByText(/telat 3 hari/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Jatuh tempo hari ini' })).getByText('Hari ini'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Sedang berjalan' })).getByText('30 Sep'),
    ).toBeInTheDocument()
    expect(screen.getByText('Diurutkan: prioritas')).toBeInTheDocument()
  })

  it('status diubah dari baris: menu, pilih, dan induk menerima task dan status', async () => {
    const { user, onChangeStatus } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah status: Blocked' }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Done' }))

    expect(onChangeStatus).toHaveBeenCalledOnce()
    expect(onChangeStatus.mock.calls[0]?.[0]).toMatchObject({ key: 'SEN-115' })
    expect(onChangeStatus.mock.calls[0]?.[1]).toBe('done')
  })

  it('"Tambah update" dan judul bekerja per baris', async () => {
    const { user, onAddUpdate, onOpenTask } = setup()

    await user.click(screen.getByRole('button', { name: 'Tambah update untuk MDC-021' }))
    await user.click(screen.getByRole('button', { name: 'Paket PenTest whitebox' }))

    expect(onAddUpdate.mock.calls[0]?.[0]).toMatchObject({ key: 'MDC-021' })
    expect(onOpenTask.mock.calls[0]?.[0]).toMatchObject({ key: 'SEN-112' })
  })

  it('daftar kosong menampilkan pesan kosong, bukan kelompok', () => {
    setup({ groups: [] })

    expect(screen.getByText('Tidak ada task hari ini')).toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('saat disaring kartu, ada tombol menghapus saringan', async () => {
    const onClearCard = vi.fn()
    const { user } = setup({ cardLabel: 'Terlambat', onClearCard })

    expect(screen.queryByText('Diurutkan: prioritas')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hapus saringan Terlambat' }))

    expect(onClearCard).toHaveBeenCalledOnce()
  })

  it('task tanpa tenggat menampilkan tanda kosong', () => {
    setup({
      groups: [
        {
          kind: 'InProgress',
          tasks: [
            {
              task: task({ id: 'z', key: 'SEN-9', title: 'Tanpa tenggat', dueDate: null }),
              path: ['Sentul'],
            },
          ],
        },
      ],
    })

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
