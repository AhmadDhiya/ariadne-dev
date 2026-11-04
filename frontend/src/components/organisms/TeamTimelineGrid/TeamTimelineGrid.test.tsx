import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  TeamTimelineGrid,
  type TeamGridPerson,
  type TeamTimelineGridProps,
} from './TeamTimelineGrid'

// Rentang 21 Sep – 4 Okt 2026 (14 hari); hari ini Senin 28 Sep = indeks 7
const flat = (n: number) => Array.from({ length: 14 }, () => n)

const RAMA: TeamGridPerson = {
  id: 'rama',
  name: 'Rama',
  counts: [0, 0, 0, 0, 0, 0, 0, 5, 6, 6, 5, 4, 0, 0],
  tasks: [
    {
      id: 't1',
      key: 'SEN-150',
      title: 'Uji beban Dispatch',
      status: 'not-started',
      priority: 'high',
      start: '2026-09-29',
      due: '2026-10-01',
      overdue: false,
      project: 'Sentul / Testing Oktober',
    },
    {
      id: 't2',
      key: 'SEN-151',
      title: 'Data dummy untuk UAT',
      status: 'fixing',
      priority: 'medium',
      start: '2026-09-23',
      due: '2026-09-26',
      overdue: true,
      project: 'Sentul / SLMS',
    },
  ],
}
const WIWIET: TeamGridPerson = { id: 'wiwiet', name: 'Wiwiet', counts: flat(2), tasks: [] }

function setup(overrides: Partial<TeamTimelineGridProps> = {}) {
  const props: TeamTimelineGridProps = {
    people: [RAMA, WIWIET],
    rangeStart: '2026-09-21',
    dayCount: 14,
    zoom: 'day',
    today: '2026-09-28',
    expanded: new Set(),
    onToggle: vi.fn(),
    onOpenPerson: vi.fn(),
    onOpenTask: vi.fn(),
    onMoveTask: vi.fn(),
    onChangeDates: vi.fn(),
    empty: <p>Belum ada anggota</p>,
    ...overrides,
  }
  render(<TeamTimelineGrid {...props} />)
  return props
}

describe('TeamTimelineGrid', () => {
  it('menampilkan satu baris per orang dengan jumlah task aktif hari ini', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Rama' })).toBeInTheDocument()
    expect(screen.getByText('5 aktif hari ini')).toBeInTheDocument()
    expect(screen.getByText('2 aktif hari ini')).toBeInTheDocument()
  })

  it('menandai beban hari ini yang berat dengan gaya khusus (angka tetap tercetak)', () => {
    setup()

    expect(screen.getByText('5 aktif hari ini')).toHaveClass('is-heavy')
    expect(screen.getByText('2 aktif hari ini')).not.toHaveClass('is-heavy')
  })

  it('task tersembunyi sampai baris orangnya dibuka', () => {
    setup()

    expect(screen.queryByText('Uji beban Dispatch')).not.toBeInTheDocument()
  })

  it('menampilkan task, jalur proyek, dan bar bila baris dibuka', () => {
    setup({ expanded: new Set(['rama']) })

    expect(screen.getByRole('button', { name: 'Uji beban Dispatch' })).toBeInTheDocument()
    expect(screen.getByText('SEN-150 · Sentul / Testing Oktober')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Buka task Rama/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    // Satu bar per task di rentang, dengan nama status (bukan hanya warna)
    const region = screen.getByRole('region', { name: 'Grafik timeline tim' })
    expect(region.querySelectorAll('.ar-bar')).toHaveLength(2)
    expect(region.querySelector('.ar-bar-not-started')).not.toBeNull()
    expect(region.querySelector('.ar-bar-fixing.is-overdue')).not.toBeNull()
  })

  it('orang tanpa task di rentang menampilkan keterangan saat dibuka', () => {
    setup({ expanded: new Set(['wiwiet']) })

    expect(screen.getByText('Tidak ada task di rentang ini')).toBeInTheDocument()
  })

  it('tombol panah membuka dan menutup baris; nama membuka dashboard orang itu', async () => {
    const props = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Buka task Rama' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rama' }))

    expect(props.onToggle).toHaveBeenCalledWith('rama')
    expect(props.onOpenPerson).toHaveBeenCalledWith(expect.objectContaining({ id: 'rama' }))
  })

  it('tombol Pindahkan dan Ubah tanggal memberi task dan pemiliknya', async () => {
    const props = setup({ expanded: new Set(['rama']) })

    await userEvent.click(screen.getByRole('button', { name: 'Pindahkan SEN-150 ke anggota lain' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ubah tanggal SEN-151' }))
    await userEvent.click(screen.getByRole('button', { name: 'Uji beban Dispatch' }))

    expect(props.onMoveTask).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'SEN-150' }),
      expect.objectContaining({ id: 'rama' }),
    )
    expect(props.onChangeDates).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'SEN-151' }),
      expect.objectContaining({ id: 'rama' }),
    )
    expect(props.onOpenTask).toHaveBeenCalledWith('SEN-150')
  })

  it('heatmap tiap orang mencetak angka per hari', () => {
    setup()

    const region = screen.getByRole('region', { name: 'Grafik timeline tim' })
    expect(within(region).getAllByTitle('6 task aktif')).toHaveLength(2)
    expect(within(region).getAllByTitle('2 task aktif')).toHaveLength(14)
  })

  it('tanpa anggota menampilkan keterangan kosong', () => {
    setup({ people: [] })

    expect(screen.getByText('Belum ada anggota')).toBeInTheDocument()
  })
})
