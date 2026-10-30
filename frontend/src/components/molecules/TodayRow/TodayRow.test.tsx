import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TodayRow } from './TodayRow'

describe('TodayRow', () => {
  it('menampilkan ID, judul, jalur proyek, tenggat, status, dan aksi', () => {
    render(
      <TodayRow
        priority="critical"
        id="SEN-115"
        title="Pipeline GitLab IRS"
        path="Sentul / Dispatch"
        onOpen={vi.fn()}
        due={<span>25 Sep</span>}
        status={<span>Blocked</span>}
        action={<button type="button">Tambah update</button>}
      />,
    )

    expect(screen.getByText('SEN-115')).toBeInTheDocument()
    expect(screen.getByText('Sentul / Dispatch')).toBeInTheDocument()
    expect(screen.getByText('25 Sep')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tambah update' })).toBeInTheDocument()
  })

  it('judul adalah tombol yang membuka task', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    render(
      <TodayRow
        priority="low"
        id="MDC-018"
        title="Konfirmasi jadwal"
        path="Migrasi Data Center"
        onOpen={onOpen}
        due="Hari ini"
        status="On Progress"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Konfirmasi jadwal' }))

    expect(onOpen).toHaveBeenCalledOnce()
  })
})
