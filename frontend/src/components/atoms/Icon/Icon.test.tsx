import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'

describe('Icon', () => {
  it('dekoratif tanpa title, bernama dengan title', () => {
    const { container, rerender } = render(<Icon name="bell" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    rerender(<Icon name="bell" title="Notifikasi" />)
    expect(screen.getByRole('img', { name: 'Notifikasi' })).toBeInTheDocument()
  })

  it('ikon prioritas memakai garis lebih tebal', () => {
    const { container } = render(<Icon name="priority-high" />)
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '2.5')
  })
})
