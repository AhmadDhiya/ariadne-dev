import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GanttChart, type GanttChartGroup, type GanttChartProps } from './GanttChart'

const GROUPS: GanttChartGroup[] = [
  {
    id: 'sen',
    label: 'Sentul',
    tasks: [
      {
        id: '1',
        key: 'SEN-115',
        title: 'Pipeline GitLab IRS',
        status: 'blocked',
        start: '2026-09-21',
        due: '2026-09-25',
        overdue: true,
      },
      {
        id: '2',
        key: 'SEN-104',
        title: 'Integrasi log & metrics',
        status: 'progress',
        start: '2026-09-28',
        due: '2026-10-02',
        overdue: false,
      },
      {
        id: '3',
        key: 'SEN-200',
        title: 'Di luar rentang',
        status: 'progress',
        start: '2026-12-01',
        due: '2026-12-05',
        overdue: false,
      },
    ],
  },
  {
    id: 'mdc',
    label: 'Migrasi Data Center',
    tasks: [
      {
        id: '4',
        key: 'MDC-021',
        title: 'Inventaris rak & kabel',
        status: 'progress',
        start: '2026-09-24',
        due: '2026-09-30',
        overdue: false,
      },
    ],
  },
]

const WORKLOAD = [3, 4, 4, 5, 5, 0, 0, 5, 4, 4, 3, 2, 0, 0, 2, 1, 1, 1, 1, 0, 0]

function setup(props: Partial<GanttChartProps> = {}) {
  const onOpenTask = vi.fn()
  render(
    <GanttChart
      groups={GROUPS}
      rangeStart="2026-09-21"
      dayCount={21}
      zoom="day"
      today="2026-09-28"
      workload={WORKLOAD}
      workloadLabel="Beban kerja saya"
      onOpenTask={onOpenTask}
      empty={<p>Tidak ada task di rentang ini</p>}
      {...props}
    />,
  )
  return { onOpenTask, user: userEvent.setup() }
}

describe('GanttChart', () => {
  it('daftar kiri berisi grup dan task; satu bar per task yang ada di rentang', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Sentul' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pipeline GitLab IRS' })).toBeInTheDocument()
    expect(screen.getByText('MDC-021')).toBeInTheDocument()
    expect(document.querySelectorAll('.ar-bar')).toHaveLength(3) // 115, 104, 021; yang di luar rentang tanpa bar
    expect(document.querySelectorAll('.ar-bar.is-overdue')).toHaveLength(1)
  })

  it('bar memakai lebar menurut hari: SEN-115 selama 5 hari dengan 40px per hari', () => {
    setup()

    const widths = [...document.querySelectorAll<HTMLElement>('.ar-bar')].map((b) => b.style.width)
    expect(widths).toContain('198px') // 5 × 40 − 2
    expect(widths).toContain('278px') // MDC-021: 7 × 40 − 2
  })

  it('kolom hari: tanggal dan huruf hari, hari ini ditandai, dan garis "Hari ini" ada', () => {
    setup()

    const header = document.querySelector('.ar-gantt-header') as HTMLElement
    expect(within(header).getAllByText('28')).toHaveLength(1)
    expect(header.querySelector('.is-today')).toHaveTextContent('28')
    expect(document.querySelectorAll('.ar-gantt-col')).toHaveLength(21)
    expect(document.querySelector('.ar-today')).not.toBeNull() // garis hari ini dari TodayMarker
  })

  it('beban kerja dicetak per hari seperti angka dari server', () => {
    setup()

    const cells = [...document.querySelectorAll('.ar-heat')].map((c) => c.textContent)
    expect(cells).toHaveLength(21)
    expect(cells.slice(0, 5)).toEqual(['3', '4', '4', '5', '5'])
    expect(cells[5]).toBe('') // akhir pekan tanpa angka
    expect(screen.getByText('Beban kerja saya')).toBeInTheDocument()
  })

  it('zoom Minggu memakai segmen pekan, dan zoom Bulan segmen bulan', () => {
    const { rerender } = renderWith('week', 70)
    expect(document.querySelectorAll('.ar-gantt-col')).toHaveLength(10)
    expect(screen.getByText('28 Sep')).toBeInTheDocument()

    rerender('month', 210)
    expect(screen.getByText('Sep')).toBeInTheDocument()
  })

  it('grup bisa dilipat: task dan bar-nya hilang, daftar lain tetap', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Sentul' }))

    expect(screen.queryByText('SEN-115')).not.toBeInTheDocument()
    expect(screen.getByText('MDC-021')).toBeInTheDocument()
    expect(document.querySelectorAll('.ar-bar')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Sentul' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('judul task membuka detailnya', async () => {
    const { user, onOpenTask } = setup()

    await user.click(screen.getByRole('button', { name: 'Integrasi log & metrics' }))

    expect(onOpenTask).toHaveBeenCalledWith('SEN-104')
  })

  it('tanpa task menampilkan pesan kosong, bukan grafik', () => {
    setup({ groups: [] })

    expect(screen.getByText('Tidak ada task di rentang ini')).toBeInTheDocument()
    expect(document.querySelector('.ar-gantt-header')).toBeNull()
  })

  it('garis hari ini tidak digambar bila hari ini di luar rentang', () => {
    setup({ today: '2027-01-01' })

    expect(document.querySelector('.ar-today')).toBeNull()
  })
})

function renderWith(zoom: 'week' | 'month', dayCount: number) {
  const build = (z: 'week' | 'month', n: number) => (
    <GanttChart
      groups={GROUPS}
      rangeStart={z === 'week' ? '2026-09-21' : '2026-08-01'}
      dayCount={n}
      zoom={z}
      today="2026-09-28"
      workload={Array.from({ length: n }, () => 1)}
      workloadLabel="Beban kerja saya"
      empty={null}
    />
  )
  const result = render(build(zoom, dayCount))
  return { rerender: (z: 'week' | 'month', n: number) => result.rerender(build(z, n)) }
}

describe('GanttChart: tampilan proyek (detail)', () => {
  const PROJECT_GROUPS: GanttChartGroup[] = [
    {
      id: 'dispatch',
      label: 'Dispatch',
      milestones: [{ id: 'm1', label: 'Go-Live Sentul · 30 Okt', date: '2026-09-30', done: false }],
      tasks: [
        {
          id: '1',
          key: 'SEN-104',
          title: 'Integrasi log & metrics',
          status: 'progress',
          start: '2026-09-28',
          due: '2026-10-02',
          overdue: false,
          assignees: ['Ahmad', 'Rama'],
          priority: 'medium',
        },
        {
          id: '2',
          key: 'SEN-122',
          title: 'Validasi jam masuk shift malam',
          status: 'fixing',
          start: '2026-09-23',
          due: '2026-09-26',
          overdue: true,
          assignees: ['Ahmad'],
          priority: 'high',
          subtask: true,
        },
      ],
    },
  ]
  const PEOPLE = [
    {
      id: 'a',
      name: 'Ahmad',
      counts: [4, 5, 6, 6, 6, 0, 0, 5, 5, 4, 4, 3, 0, 0, 1, 1, 1, 1, 1, 0, 0],
    },
    { id: 'w', name: 'Wiwiet', counts: [1, 1, 1, 1, 1, ...Array.from({ length: 16 }, () => 0)] },
  ]

  function detailed(props: Partial<GanttChartProps> = {}) {
    render(
      <GanttChart
        detailed
        leftWidth={360}
        groups={PROJECT_GROUPS}
        rangeStart="2026-09-21"
        dayCount={21}
        zoom="day"
        today="2026-09-28"
        people={PEOPLE}
        empty={<p>Kosong</p>}
        {...props}
      />,
    )
  }

  it('daftar kiri 360px berkepala "Task" dan "PIC", dengan avatar PIC dan sub-task menjorok', () => {
    detailed()

    expect(screen.getByText('PIC')).toBeInTheDocument()
    expect(document.querySelector('.ar-gantt-left')).toHaveStyle({ width: '360px' })
    expect(document.querySelectorAll('.ar-gantt-task .ar-avatar').length).toBeGreaterThanOrEqual(3)
    expect(document.querySelector('.ar-gantt-task.is-sub')).toHaveTextContent('SEN-122')
  })

  it('bar punya label nama PIC dan ikon prioritas di kanannya, dan grup punya pita', () => {
    detailed()

    const labels = [...document.querySelectorAll('.ar-bar-label')].map((el) => el.textContent)
    expect(labels[0]).toContain('Ahmad, Rama')
    expect(labels[1]).toContain('Ahmad')
    expect(document.querySelectorAll('.ar-bar-label .ar-prio')).toHaveLength(2)
    expect(document.querySelectorAll('.ar-gantt-band')).toHaveLength(1)
  })

  it('milestone digambar di baris grupnya pada harinya, dengan labelnya', () => {
    detailed()

    expect(screen.getByText('Go-Live Sentul · 30 Okt')).toBeInTheDocument()
    const diamond = document.querySelector<HTMLElement>('.ar-ms')
    expect(diamond?.style.left).toBe(`${9 * 40 + 20}px`) // 30 Sep = hari ke-10
  })

  it('milestone di luar rentang tidak digambar', () => {
    detailed({
      groups: [
        {
          ...(PROJECT_GROUPS[0] as GanttChartGroup),
          milestones: [{ id: 'm', label: 'Jauh', date: '2027-03-01', done: false }],
        },
      ],
    })

    expect(screen.queryByText('Jauh')).not.toBeInTheDocument()
  })

  it('beban kerja per orang: nama di kiri, satu baris angka per orang di kanan, dan legenda skala', () => {
    detailed()

    expect(screen.getByText('Beban kerja per orang')).toBeInTheDocument()
    expect(screen.getByText('Wiwiet')).toBeInTheDocument()
    expect(document.querySelectorAll('.ar-gantt-personrow')).toHaveLength(2)
    const first = [
      ...(document.querySelectorAll('.ar-gantt-personrow')[0]?.querySelectorAll('.ar-heat') ?? []),
    ]
    expect(first.slice(0, 5).map((c) => c.textContent)).toEqual(['4', '5', '6', '6', '6'])
    expect(document.querySelectorAll('.ar-gantt-legend .ar-heat')).toHaveLength(6)
    expect(screen.queryByText('Beban kerja saya')).not.toBeInTheDocument()
  })
})
