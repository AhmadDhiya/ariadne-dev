import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MoveCandidates } from '@/types/api'
import { MoveTaskDialog, type MoveTaskDialogProps } from './MoveTaskDialog'

const person = (userId: string, name: string, counts: number[], isAssignee = false) => ({
  userId,
  name,
  isAssignee,
  counts,
  peak: Math.max(...counts),
})

const CANDIDATES: MoveCandidates = {
  start: '2026-09-29',
  dayCount: 3,
  assignees: [{ id: 'rama', name: 'Rama' }],
  candidates: [
    person('rama', 'Rama', [0, 0, 0], true),
    person('wi', 'Wiwiet', [3, 3, 3]),
    person('ga', 'Galih', [2, 1, 1]),
    person('ah', 'Ahmad', [5, 4, 4]),
  ],
}

function setup(overrides: Partial<MoveTaskDialogProps> = {}) {
  const props: MoveTaskDialogProps = {
    open: true,
    onClose: vi.fn(),
    taskLabel: 'SEN-150 Uji beban Dispatch',
    context: 'saat ini: Rama',
    from: { id: 'rama', name: 'Rama' },
    candidates: CANDIDATES,
    onSubmit: vi.fn(),
    ...overrides,
  }
  render(<MoveTaskDialog {...props} />)
  return props
}

describe('MoveTaskDialog', () => {
  it('menyebut task dan PIC saat ini, dan tidak menawarkan PIC itu sebagai penerima', () => {
    setup()

    expect(screen.getByText(/SEN-150 Uji beban Dispatch/)).toBeInTheDocument()
    expect(screen.getByText(/saat ini: Rama/)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Rama' })).not.toBeInTheDocument()
  })

  it('memilih yang paling longgar lebih dulu dan menyebut bebannya', () => {
    setup()

    expect(screen.getByRole('radio', { name: 'Galih' })).toBeChecked()
    expect(screen.getByText('paling longgar')).toBeInTheDocument()
    expect(screen.getByText('padat')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Beban 3 hari (29 Sep – 1 Okt). Galih paling longgar: 1–2 task aktif per hari.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pindahkan ke Galih' })).toBeEnabled()
  })

  it('mengganti pilihan memperbarui ringkasan dan tombol', async () => {
    setup()

    await userEvent.click(screen.getByRole('radio', { name: 'Wiwiet' }))

    expect(screen.getByRole('button', { name: 'Pindahkan ke Wiwiet' })).toBeInTheDocument()
    expect(
      screen.getByText('Beban 3 hari (29 Sep – 1 Okt). Wiwiet: 3 task aktif per hari.'),
    ).toBeInTheDocument()
  })

  it('mengirim penerima dan pilihan kabari (default menyala)', async () => {
    const props = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Pindahkan ke Galih' }))

    expect(props.onSubmit).toHaveBeenCalledWith({ toUserId: 'ga', notify: true })
  })

  it('opsi kabari bisa dimatikan', async () => {
    const props = setup()

    await userEvent.click(screen.getByRole('checkbox', { name: /Kabari Rama dan Galih/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pindahkan ke Galih' }))

    expect(props.onSubmit).toHaveBeenCalledWith({ toUserId: 'ga', notify: false })
  })

  it('pencarian menyaring daftar, dan pilihan terpilih tetap yang terlonggar bila tidak diganti', async () => {
    setup()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Cari anggota' }), 'ahm')

    expect(screen.getByRole('radio', { name: 'Ahmad' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Wiwiet' })).not.toBeInTheDocument()
  })

  it('selama memuat tidak ada penerima dan tombol mati', () => {
    setup({ candidates: undefined, loading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Memuat calon penerima…')
    expect(screen.getByRole('button', { name: 'Pindahkan' })).toBeDisabled()
  })

  it('menampilkan kegagalan memuat dan kesalahan dari server', () => {
    setup({ candidates: undefined, loadError: 'Tidak bisa memuat.', error: 'Penerima tidak sah.' })

    expect(screen.getByText('Tidak bisa memuat.')).toBeInTheDocument()
    expect(screen.getByText('Penerima tidak sah.')).toBeInTheDocument()
  })

  it('tanpa calon lain menjelaskan keadaannya', () => {
    setup({ candidates: { ...CANDIDATES, candidates: [person('rama', 'Rama', [0, 0, 0], true)] } })

    expect(
      screen.getByText('Tidak ada anggota lain yang bisa menerima task ini.'),
    ).toBeInTheDocument()
  })

  it('tombol mati selama mengirim', () => {
    setup({ submitting: true })

    expect(screen.getByRole('button', { name: 'Pindahkan ke Galih' })).toBeDisabled()
  })
})
