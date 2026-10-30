import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AttentionItem } from '@/types/api'
import { AttentionPanel } from './AttentionPanel'

const ITEMS: AttentionItem[] = [
  {
    kind: 'Mention',
    taskKey: 'SEN-115',
    taskTitle: 'Pipeline GitLab IRS',
    actorName: 'Syaikhan',
    detail: '@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?',
    at: '2026-09-28T01:55:00Z',
    startDate: null,
    dueDate: null,
    lateDays: 0,
  },
  {
    kind: 'Assigned',
    taskKey: 'MDC-024',
    taskTitle: 'Rencana cut-over',
    actorName: 'Wiwiet',
    detail: null,
    at: '2026-09-28T01:30:00Z',
    startDate: '2026-10-05',
    dueDate: '2026-10-09',
    lateDays: 0,
  },
  {
    kind: 'Overdue',
    taskKey: 'SEN-121',
    taskTitle: 'Perbaikan temuan UAT modul absensi',
    actorName: null,
    detail: null,
    at: null,
    startDate: null,
    dueDate: '2026-09-26',
    lateDays: 2,
  },
]

describe('AttentionPanel', () => {
  it('menampilkan jenis, kalimat, kutipan, dan jam tiap butir', () => {
    render(<AttentionPanel items={ITEMS} today="2026-09-28" onOpenTask={vi.fn()} />)

    expect(screen.getByText('Di-mention')).toBeInTheDocument()
    expect(screen.getByText('Syaikhan')).toBeInTheDocument()
    expect(screen.getByText(/menyebut Anda di SEN-115/)).toBeInTheDocument()
    expect(screen.getByText(/apakah runner boleh lewat proxy/)).toBeInTheDocument()
    expect(screen.getByText('08.55')).toBeInTheDocument()
    expect(screen.getByText(/menugaskan MDC-024 ke Anda/)).toBeInTheDocument()
    expect(screen.getByText('Rencana cut-over · mulai 5 Okt')).toBeInTheDocument()
    expect(screen.getByText(/lewat tenggat 2 hari/)).toBeInTheDocument()
  })

  it('klik butir membuka task-nya', async () => {
    const user = userEvent.setup()
    const onOpenTask = vi.fn()
    render(<AttentionPanel items={ITEMS} today="2026-09-28" onOpenTask={onOpenTask} />)

    await user.click(screen.getByRole('button', { name: /menugaskan MDC-024/ }))

    expect(onOpenTask).toHaveBeenCalledWith('MDC-024')
  })

  it('tanpa butir menampilkan kalimat kosong', () => {
    render(<AttentionPanel items={[]} today="2026-09-28" onOpenTask={vi.fn()} />)

    expect(screen.getByText('Tidak ada yang perlu perhatian saat ini.')).toBeInTheDocument()
  })
})
