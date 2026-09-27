import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriorityIcon } from './PriorityIcon'

describe('PriorityIcon', () => {
  it('tanpa label tetap punya nama untuk pembaca layar', () => {
    render(<PriorityIcon priority="critical" />)
    expect(screen.getByRole('img', { name: 'Prioritas Critical' })).toBeInTheDocument()
  })

  it('dengan label menampilkan kata prioritas', () => {
    render(<PriorityIcon priority="low" showLabel />)
    expect(screen.getByText('Low')).toBeInTheDocument()
  })
})
