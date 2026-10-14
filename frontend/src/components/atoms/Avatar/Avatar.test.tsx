import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('menampilkan inisial dan memberi nama lengkap; tamu bergaris', () => {
    render(<Avatar name="Pak Budi" guest />)
    const avatar = screen.getByRole('img', { name: 'Pak Budi (Tamu)' })
    expect(avatar).toHaveTextContent('PB')
    expect(avatar).toHaveClass('is-guest')
  })
})
