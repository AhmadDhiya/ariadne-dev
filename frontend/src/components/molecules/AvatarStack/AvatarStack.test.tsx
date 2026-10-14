import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AvatarStack } from './AvatarStack'

describe('AvatarStack', () => {
  it('lebih dari max digabung menjadi +N', () => {
    render(<AvatarStack names={['Syaikhan', 'Wiwiet', 'Ahmad', 'Manto', 'Rama']} max={3} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'dan 2 orang lain' })).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(4)
  })
})
