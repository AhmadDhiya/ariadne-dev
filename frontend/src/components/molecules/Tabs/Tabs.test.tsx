import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

describe('Tabs', () => {
  it('hanya tab aktif yang bisa di-Tab; panah kanan pindah ke tab berikutnya', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Tabs items={['Tabel', 'Gantt', 'Milestone']} active="Tabel" onSelect={onSelect} />)

    await user.tab()
    expect(screen.getByRole('tab', { name: 'Tabel' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(onSelect).toHaveBeenCalledWith('Gantt')
    expect(screen.getByRole('tab', { name: 'Gantt' })).toHaveFocus()
  })
})
