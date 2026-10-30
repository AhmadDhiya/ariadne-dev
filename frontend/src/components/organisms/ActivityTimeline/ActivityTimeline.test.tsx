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
  editedAt: null,
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

  describe('mengubah dan menghapus', () => {
    const PEOPLE = [
      { id: 'ah', name: 'Ahmad', role: 'Pengelola' as const },
      { id: 'bu', name: 'Pak Budi', role: 'Tamu' as const },
    ]
    const MINE = ITEMS[2] as ActivityItem // komentar Syaikhan dengan @Ahmad
    const setup = (
      permissions: (item: ActivityItem) => { canEdit: boolean; canDelete: boolean },
    ) => {
      const onEdit = vi.fn().mockResolvedValue(undefined)
      const onDelete = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(
        <ActivityTimeline
          items={ITEMS}
          today="2026-09-28"
          people={PEOPLE}
          permissionsOf={permissions}
          onEdit={onEdit}
          onDelete={onDelete}
        />,
      )
      return { onEdit, onDelete, user }
    }
    const mineOnly = (item: ActivityItem) => ({
      canEdit: item.id === MINE.id,
      canDelete: item.id === MINE.id,
    })

    it('tombol Ubah dan Hapus hanya di entri yang diizinkan, dan tidak pernah di log otomatis', () => {
      setup(mineOnly)

      expect(screen.getAllByRole('button', { name: /^Ubah tulisan/ })).toHaveLength(1)
      expect(screen.getAllByRole('button', { name: /^Hapus tulisan/ })).toHaveLength(1)
    })

    it('tanpa izin sama sekali (Tamu pada tulisan orang lain) tidak ada tombol', () => {
      setup(() => ({ canEdit: false, canDelete: false }))

      expect(screen.queryByRole('button', { name: /^Ubah tulisan/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Hapus tulisan/ })).not.toBeInTheDocument()
    })

    it('Pengelola yang hanya boleh menghapus tidak melihat tombol Ubah', () => {
      setup((item) => ({ canEdit: false, canDelete: item.id === MINE.id }))

      expect(screen.queryByRole('button', { name: /^Ubah tulisan/ })).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /^Hapus tulisan/ })).toHaveLength(1)
    })

    it('Ubah membuka editor berisi teks lama; Simpan mengirim teks baru dan orang yang ditandai', async () => {
      const { onEdit, user } = setup(mineOnly)

      await user.click(screen.getByRole('button', { name: /^Ubah tulisan/ }))
      const box = screen.getByRole('combobox', { name: 'Ubah komentar' })
      expect(box).toHaveValue('@Ahmad bisa dicek apakah runner boleh lewat proxy?')
      await user.clear(box)
      await user.type(box, '@Ahmad sudah selesai')
      await user.click(screen.getByRole('button', { name: 'Simpan' }))

      expect(onEdit).toHaveBeenCalledExactlyOnceWith(MINE, '@Ahmad sudah selesai', ['ah'])
      expect(screen.queryByRole('combobox', { name: 'Ubah komentar' })).not.toBeInTheDocument() // editor menutup
    })

    it('Batal membuang perubahan', async () => {
      const { onEdit, user } = setup(mineOnly)

      await user.click(screen.getByRole('button', { name: /^Ubah tulisan/ }))
      await user.type(screen.getByRole('combobox', { name: 'Ubah komentar' }), ' tambahan')
      await user.click(screen.getByRole('button', { name: 'Batal' }))

      expect(onEdit).not.toHaveBeenCalled()
      expect(screen.getByText(/bisa dicek apakah runner/)).toBeInTheDocument()
    })

    it('catatan internal yang diubah tidak menawarkan Tamu untuk ditandai', async () => {
      const { user } = setup((item) => ({ canEdit: item.kind === 'Internal', canDelete: false }))

      await user.click(screen.getByRole('button', { name: /^Ubah tulisan/ }))
      const box = screen.getByRole('combobox', { name: 'Ubah catatan internal' })
      await user.clear(box)
      await user.type(box, '@pak')

      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })

    it('Hapus meminta konfirmasi dulu, baru menghapus', async () => {
      const { onDelete, user } = setup(mineOnly)

      await user.click(screen.getByRole('button', { name: /^Hapus tulisan/ }))
      expect(onDelete).not.toHaveBeenCalled()
      expect(screen.getByText('Hapus entri ini?')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Ya, hapus' }))

      expect(onDelete).toHaveBeenCalledExactlyOnceWith(MINE)
    })

    it('Batal pada konfirmasi tidak menghapus', async () => {
      const { onDelete, user } = setup(mineOnly)

      await user.click(screen.getByRole('button', { name: /^Hapus tulisan/ }))
      await user.click(screen.getByRole('button', { name: 'Batal' }))

      expect(onDelete).not.toHaveBeenCalled()
      expect(screen.queryByText('Hapus entri ini?')).not.toBeInTheDocument()
    })

    it('entri yang pernah diubah ditandai "diubah"', () => {
      render(
        <ActivityTimeline
          items={[item({ id: 'e', body: 'Isi baru', editedAt: '2026-09-28T03:00:00Z' })]}
          today="2026-09-28"
        />,
      )

      expect(screen.getByText(/diubah/)).toBeInTheDocument()
    })
  })
})
