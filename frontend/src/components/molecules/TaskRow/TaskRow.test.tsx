import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskRow, type TaskRowProps } from './TaskRow'

function setup(props: Partial<TaskRowProps> = {}) {
  const base: TaskRowProps = {
    id: 'SEN-115',
    title: 'Pipeline GitLab IRS',
    priority: 'critical',
    status: <span>Status</span>,
    assignees: ['Wiwiet', 'Ahmad'],
    start: '21 Sep',
    due: '25 Sep',
    overdue: true,
    lateDays: 3,
    duration: 5,
    labels: ['DevOps'],
  }
  render(
    <table>
      <tbody>
        <TaskRow {...base} {...props} />
      </tbody>
    </table>,
  )
}

describe('TaskRow', () => {
  it('menampilkan ID, judul, tanggal, durasi, dan label', () => {
    setup()

    expect(screen.getByText('SEN-115')).toBeInTheDocument()
    expect(screen.getByText('Pipeline GitLab IRS')).toBeInTheDocument()
    expect(screen.getByText('21 Sep')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('DevOps')).toBeInTheDocument()
  })

  it('task terlambat memberi tahu pembaca layar berapa hari telatnya, tidak hanya lewat warna', () => {
    setup()

    expect(screen.getByText(/telat 3 hari/)).toBeInTheDocument()
  })

  it('tanggal yang kosong tampil sebagai garis tetapi dibaca "kosong"', () => {
    setup({ start: null, due: null, overdue: false, duration: null, assignees: [] })

    expect(screen.getAllByText('kosong').length).toBeGreaterThanOrEqual(4)
  })

  it('judul menjadi tombol hanya bila bisa dibuka', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    setup({ onOpen })

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab IRS' }))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('tanpa onOpen judul hanya teks', () => {
    setup()

    expect(screen.queryByRole('button', { name: 'Pipeline GitLab IRS' })).not.toBeInTheDocument()
  })

  it('task dengan sub-task punya tombol lipat dengan keadaan yang jelas', async () => {
    const user = userEvent.setup()
    const onToggleExpand = vi.fn()
    setup({ expandable: true, expanded: true, subtaskSummary: '1/3', onToggleExpand })
    const toggle = screen.getByRole('button', { name: 'Sembunyikan sub-task SEN-115' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)

    expect(onToggleExpand).toHaveBeenCalled()
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })
})
