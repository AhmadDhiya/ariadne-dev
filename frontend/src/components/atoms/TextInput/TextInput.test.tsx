import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextInput } from './TextInput'

describe('TextInput', () => {
  it('invalid dari prop maupun dari FormField (aria-invalid) sama-sama ditandai', () => {
    const { rerender } = render(<TextInput aria-label="Email" invalid />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    rerender(<TextInput aria-label="Email" aria-invalid />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    rerender(<TextInput aria-label="Email" />)
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
  })
})
