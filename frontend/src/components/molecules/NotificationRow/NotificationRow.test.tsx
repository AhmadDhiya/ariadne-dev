import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NotificationRow, type NotificationRowProps } from './NotificationRow'

const BASE: Omit<NotificationRowProps, 'onOpen'> = {
  label: 'Di-mention',
  icon: 'at',
  tone: 'info',
  who: 'Syaikhan',
  text: 'menyebut Anda di SEN-115',
  detail: '“@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?”',
  time: '08.55',
  unread: true,
  href: '/proyek/p1/tabel?task=SEN-115',
}

describe('NotificationRow', () => {
  it('menampilkan jenis, kalimat, keterangan, jam, dan tanda belum dibaca', () => {
    render(<NotificationRow {...BASE} onOpen={vi.fn()} />)

    const link = screen.getByRole('link', { name: /Syaikhan menyebut Anda di SEN-115/ })
    expect(link).toHaveAttribute('href', '/proyek/p1/tabel?task=SEN-115')
    expect(link).toHaveTextContent('Di-mention')
    expect(link).toHaveTextContent('08.55')
    expect(link).toHaveTextContent('Belum dibaca')
    expect(screen.getByText(/runner boleh lewat proxy/)).toHaveClass('is-truncated')
  })

  it('yang sudah dibaca tidak punya tanda', () => {
    render(<NotificationRow {...BASE} unread={false} truncate={false} onOpen={vi.fn()} />)

    expect(screen.queryByText('Belum dibaca')).not.toBeInTheDocument()
    expect(screen.getByText(/runner boleh lewat proxy/)).not.toHaveClass('is-truncated')
  })

  it('klik biasa memanggil onOpen tanpa pindah halaman sendiri', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(<NotificationRow {...BASE} onOpen={onOpen} />)

    await user.click(screen.getByRole('link'))

    expect(onOpen).toHaveBeenCalledOnce()
  })
})
