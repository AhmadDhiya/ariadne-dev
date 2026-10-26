import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GroupRow } from './GroupRow'

function setup(collapsed: boolean) {
  const onToggle = vi.fn()
  render(
    <table>
      <tbody>
        <GroupRow
          title="SLMS"
          meta="2 task"
          collapsed={collapsed}
          onToggle={onToggle}
          colSpan={10}
        />
      </tbody>
    </table>,
  )
  return onToggle
}

describe('GroupRow', () => {
  it('memberi tahu pembaca layar apakah grup terbuka atau dilipat', () => {
    setup(false)

    expect(screen.getByRole('button', { name: /SLMS/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('grup yang dilipat ditandai dan bisa dibuka dengan klik atau keyboard', async () => {
    const user = userEvent.setup()
    const onToggle = setup(true)
    const button = screen.getByRole('button', { name: /SLMS/ })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    await user.keyboard('{Enter}')

    expect(onToggle).toHaveBeenCalledTimes(2)
  })
})
