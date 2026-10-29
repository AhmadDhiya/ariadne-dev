import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectProgress } from './ProjectProgress'

describe('ProjectProgress', () => {
  it('menampilkan persen dan jumlah task selesai', () => {
    render(<ProjectProgress projectName="Sentul" done={41} total={71} percent={58} />)

    expect(screen.getByRole('progressbar', { name: 'Progres Sentul' })).toHaveAttribute(
      'aria-valuenow',
      '58',
    )
    expect(screen.getByText('58%')).toBeInTheDocument()
    expect(screen.getByText('41 dari 71 task selesai')).toBeInTheDocument()
  })

  it('proyek tanpa task tidak menulis "0 dari 0"', () => {
    render(<ProjectProgress projectName="Baru" done={0} total={0} percent={0} />)

    expect(screen.getByText('Belum ada task')).toBeInTheDocument()
    expect(screen.queryByText(/dari 0/)).not.toBeInTheDocument()
  })
})
