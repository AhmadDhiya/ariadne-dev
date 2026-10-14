import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('FormField', () => {
  it('label, petunjuk, dan kesalahan terhubung ke input bawaan browser', () => {
    render(
      <FormField label="Alasan tertahan" hint="Jelaskan singkat" error="Wajib diisi" required>
        {(field) => <input {...field} />}
      </FormField>,
    )
    const input = screen.getByLabelText(/Alasan tertahan/)
    expect(input).toHaveAccessibleDescription('Jelaskan singkat Wajib diisi')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Wajib diisi')
  })

  it('tanpa kesalahan tidak ada aria-invalid', () => {
    render(<FormField label="Email">{(field) => <input {...field} />}</FormField>)
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
  })
})
