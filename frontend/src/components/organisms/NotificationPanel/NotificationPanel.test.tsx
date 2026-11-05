import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NotificationItem } from '@/types/api'
import { NotificationPanel, type NotificationPanelProps } from './NotificationPanel'

const item = (over: Partial<NotificationItem>): NotificationItem => ({
  id: 'n1',
  kind: 'Mention',
  taskId: 't1',
  taskKey: 'SEN-115',
  taskTitle: 'Pipeline GitLab IRS',
  status: 'Blocked',
  projectId: 'p1',
  path: ['Sentul', 'Dispatch'],
  actorName: 'Syaikhan',
  fromName: null,
  excerpt: '@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?',
  startDate: null,
  dueDate: null,
  lateDays: 0,
  createdAt: '2026-09-28T01:55:00Z',
  read: false,
  ...over,
})

const ITEMS: NotificationItem[] = [
  item({}),
  item({
    id: 'n2',
    kind: 'Moved',
    taskKey: 'SEN-117',
    taskTitle: 'Buka akses runner ke staging',
    fromName: 'Rama',
    excerpt: null,
    createdAt: '2026-09-28T01:12:00Z',
  }),
  item({
    id: 'n3',
    kind: 'Overdue',
    taskKey: 'SEN-121',
    actorName: null,
    excerpt: null,
    lateDays: 2,
    createdAt: '2026-09-28T00:00:00Z',
    read: true,
  }),
  item({ id: 'n4', taskKey: 'SEN-112', createdAt: '2026-09-27T09:40:00Z', read: true }),
]

function setup(over: Partial<NotificationPanelProps> = {}) {
  const props: NotificationPanelProps = {
    items: ITEMS,
    today: '2026-09-28',
    unread: 2,
    filter: 'all',
    onFilterChange: vi.fn(),
    onOpen: vi.fn(),
    onMarkAllRead: vi.fn(),
    ...over,
  }
  render(<NotificationPanel {...props} />)
  return props
}

describe('NotificationPanel', () => {
  it('mengelompokkan per hari dan menyusun kalimat tiap jenis (mockup 10)', () => {
    setup()

    const panel = screen.getByRole('dialog', { name: 'Notifikasi' })
    const today = within(panel).getByRole('region', { name: 'Hari ini' })
    expect(within(today).getAllByRole('link')).toHaveLength(3)
    expect(today).toHaveTextContent('Syaikhan menyebut Anda di SEN-115')
    expect(today).toHaveTextContent('Syaikhan memindahkan SEN-117 dari Rama ke Anda')
    expect(today).toHaveTextContent('Buka akses runner ke staging · Sentul / Dispatch')
    expect(today).toHaveTextContent('SEN-121 lewat tenggat 2 hari')
    expect(today).toHaveTextContent('08.55')
    const yesterday = within(panel).getByRole('region', { name: 'Kemarin' })
    expect(yesterday).toHaveTextContent('16.40')
    expect(within(panel).getAllByText('Belum dibaca')).toHaveLength(2)
    expect(within(panel).getByRole('tab', { name: 'Belum dibaca · 2' })).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Lihat semua notifikasi' })).toHaveAttribute(
      'href',
      '/notifikasi',
    )
  })

  it('tab, klik notifikasi, dan "Tandai semua dibaca" memanggil aksinya', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole('tab', { name: 'Di-mention' }))
    expect(props.onFilterChange).toHaveBeenCalledWith('mentions')
    await user.click(screen.getByRole('link', { name: /memindahkan SEN-117/ }))
    expect(props.onOpen).toHaveBeenCalledWith(ITEMS[1])
    await user.click(screen.getByRole('button', { name: 'Tandai semua dibaca' }))
    expect(props.onMarkAllRead).toHaveBeenCalledOnce()
  })

  it('tanpa yang belum dibaca, "Tandai semua dibaca" tidak aktif dan tab tanpa angka', () => {
    setup({ unread: 0, filter: 'unread', items: [] })

    expect(screen.getByRole('button', { name: 'Tandai semua dibaca' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'Belum dibaca' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Semua notifikasi sudah dibaca.')).toBeInTheDocument()
  })

  it('versi halaman: tanpa judul dan tautan, dengan "Muat lebih banyak"', async () => {
    const user = userEvent.setup()
    const onLoadMore = vi.fn()
    setup({ variant: 'page', hasMore: true, onLoadMore })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Lihat semua notifikasi' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Muat lebih banyak' }))
    expect(onLoadMore).toHaveBeenCalledOnce()
  })
})
