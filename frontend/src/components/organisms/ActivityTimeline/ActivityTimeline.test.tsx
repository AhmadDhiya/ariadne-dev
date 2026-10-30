import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityItem } from '@/types/api'
import { ActivityTimeline } from './ActivityTimeline'

const item = (over: Partial<ActivityItem>): ActivityItem => ({
  id: 'a',
  kind: 'Comment',
  authorId: 'u',
  authorName: 'Syaikhan',
  authorIsGuest: false,
  body: 'Halo',
  mentions: [],
  logKind: null,
  data: null,
  createdAt: '2026-09-28T02:12:00Z',
  ...over,
})

const ITEMS: ActivityItem[] = [
  item({
    id: '1',
    authorName: 'Pak Budi',
    authorIsGuest: true,
    body: 'Tim kami sedang memproses firewall-nya, estimasi Rabu.',
  }),
  item({ id: '2', kind: 'Internal', body: 'Eskalasi ke manajer infrastruktur klien.' }),
  item({
    id: '3',
    body: '@Ahmad bisa dicek apakah runner boleh lewat proxy?',
    mentions: [{ userId: 'x', name: 'Ahmad' }],
    createdAt: '2026-09-27T05:00:00Z',
  }),
  item({ id: '4', kind: 'Update', authorName: 'Wiwiet', body: 'Runner sudah terpasang.' }),
  item({
    id: '5',
    kind: 'Log',
    authorName: 'Wiwiet',
    body: null,
    logKind: 'StatusChanged',
    data: { from: 'OnProgress', to: 'Blocked' },
    createdAt: '2026-09-25T05:00:00Z',
  }),
]

describe('ActivityTimeline', () => {
  it('menampilkan keempat jenis entri dengan waktu "09.12", "Kemarin", dan tanggal', () => {
    render(<ActivityTimeline items={ITEMS} today="2026-09-28" />)

    expect(
      screen.getByText('Tim kami sedang memproses firewall-nya, estimasi Rabu.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Tamu')).toBeInTheDocument() // penulis dari luar tim diberi tanda
    expect(screen.getByText('Internal')).toBeInTheDocument()
    expect(screen.getByText('Update')).toBeInTheDocument()
    expect(screen.getByText('mengubah status On Progress → Blocked')).toBeInTheDocument()
    expect(screen.getAllByText('09.12')).toHaveLength(3)
    expect(screen.getByText('Kemarin')).toBeInTheDocument()
    expect(screen.getByText('25 Sep')).toBeInTheDocument()
  })

  it('@nama yang ditandai disorot, teks lain tetap biasa', () => {
    const { container } = render(<ActivityTimeline items={ITEMS} today="2026-09-28" />)

    expect([...container.querySelectorAll('.ar-mention')].map((el) => el.textContent)).toEqual([
      '@Ahmad',
    ])
  })

  it('kosong, memuat, dan gagal punya tampilan sendiri; gagal bisa dicoba lagi', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<ActivityTimeline items={[]} today="2026-09-28" />)
    expect(screen.getByText('Belum ada aktivitas.')).toBeInTheDocument()

    rerender(<ActivityTimeline items={[]} today="2026-09-28" loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Memuat aktivitas')

    rerender(
      <ActivityTimeline items={[]} today="2026-09-28" error="Gagal memuat." onRetry={onRetry} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat.')
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('tombol "lebih lama" hanya ada bila masih ada, dan memuat saat diklik', async () => {
    const onLoadMore = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<ActivityTimeline items={ITEMS} today="2026-09-28" />)
    expect(screen.queryByRole('button', { name: /lebih lama/ })).not.toBeInTheDocument()

    rerender(<ActivityTimeline items={ITEMS} today="2026-09-28" hasMore onLoadMore={onLoadMore} />)
    await user.click(screen.getByRole('button', { name: 'Tampilkan aktivitas lebih lama' }))
    expect(onLoadMore).toHaveBeenCalledOnce()

    rerender(<ActivityTimeline items={ITEMS} today="2026-09-28" hasMore loadingMore />)
    expect(screen.getByRole('button', { name: 'Memuat…' })).toBeDisabled()
  })
})
