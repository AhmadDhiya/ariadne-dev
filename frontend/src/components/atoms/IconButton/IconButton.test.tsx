import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('badge di atas 99 ditulis 99+ dan jumlahnya masuk ke nama tombol', () => {
    render(<IconButton icon="bell" label="Notifikasi" badge={120} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifikasi (120)' })).toBeInTheDocument()
  })

  it('tanpa badge, nama tombol = label', () => {
    render(<IconButton icon="x" label="Tutup" size="sm" />)
    expect(screen.getByRole('button', { name: 'Tutup' })).toHaveClass('ar-iconbtn-sm')
  })
})
