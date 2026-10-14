import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeatCell } from './HeatCell'

describe('HeatCell', () => {
  it.each([
    [0, 'ar-heat-0', ''],
    [3, 'ar-heat-3', '3'],
    [7, 'ar-heat-5', '7'],
    [12, 'ar-heat-5', '9+'],
  ])('%i task aktif → %s, angka "%s"', (count, className, text) => {
    const { container } = render(<HeatCell count={count} />)
    expect(container.firstChild).toHaveClass(className)
    expect(container.firstChild).toHaveTextContent(text)
    expect(container.firstChild).toHaveAttribute('title', `${count} task aktif`)
  })
})
