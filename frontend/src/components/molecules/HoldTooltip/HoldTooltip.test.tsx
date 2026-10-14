import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HoldTooltip } from './HoldTooltip'

describe('HoldTooltip', () => {
  it('terbuka saat tombol info mendapat fokus, dan tertutup dengan Esc', async () => {
    const user = userEvent.setup()
    render(
      <HoldTooltip
        status="blocked"
        reason="Port 443 masih ditutup"
        waitingOn="Manto"
        since="24 Sep"
      />,
    )

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.tab()
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Port 443 masih ditutup')
    expect(tooltip).toHaveTextContent('sejak 24 Sep')
    expect(screen.getByRole('button', { name: 'Alasan Blocked' })).toHaveAttribute(
      'aria-describedby',
      tooltip.id,
    )

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('pihak luar ditampilkan tanpa avatar', () => {
    render(
      <HoldTooltip
        status="request"
        reason="Akses VPN"
        waitingOn="Klien — tim IT"
        waitingOnIsPerson={false}
        open
      />,
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent('Klien — tim IT')
    expect(screen.queryByRole('img', { name: 'Klien — tim IT' })).not.toBeInTheDocument()
  })
})
