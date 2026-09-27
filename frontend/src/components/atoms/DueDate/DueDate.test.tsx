import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DueDate } from './DueDate'

describe('DueDate', () => {
  it('terlambat ditandai ikon dan teks, bukan warna saja', () => {
    const { container } = render(
      <DueDate overdue lateBy={3}>
        25 Sep
      </DueDate>,
    )
    expect(screen.getByText('· telat 3 hari')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('belum terlambat: hanya tanggal', () => {
    const { container } = render(<DueDate>2 Okt</DueDate>)
    expect(container).toHaveTextContent(/^2 Okt$/)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
