import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilterChip } from './FilterChip'

describe('FilterChip', () => {
  it('toggle aktif ditandai centang dan aria-pressed, bukan warna saja', () => {
    const { container } = render(<FilterChip label="Terlambat" toggle active />)
    expect(screen.getByRole('button', { name: 'Terlambat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('nilai terpilih tampil sebagai "PIC: Ahmad"', () => {
    render(<FilterChip label="PIC" value="Ahmad" />)
    expect(screen.getByRole('button')).toHaveTextContent('PIC: Ahmad')
  })
})
