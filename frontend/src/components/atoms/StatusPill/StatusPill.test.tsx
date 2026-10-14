import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STATUSES } from '@/lib/status'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it.each(STATUSES)('$label selalu tampil sebagai ikon + teks', (status) => {
    const { container } = render(<StatusPill status={status.key} />)
    expect(screen.getByText(status.label)).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('ar-pill', `ar-pill-${status.key}`)
  })

  it('mode select adalah tombol yang memberi tahu status saat ini', () => {
    render(<StatusPill status="blocked" select open />)
    const button = screen.getByRole('button', { name: 'Ubah status: Blocked' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-haspopup', 'listbox')
  })
})
