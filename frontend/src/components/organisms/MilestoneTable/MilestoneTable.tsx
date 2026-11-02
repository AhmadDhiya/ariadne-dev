import type { ReactNode } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Icon } from '@/components/atoms/Icon'
import { DataTable, type Column } from '@/components/molecules/DataTable'
import { formatShortDate } from '@/lib/dates'
import { milestonePlace } from '@/lib/milestones'
import type { MilestoneItem } from '@/types/api'
import './MilestoneTable.css'

export interface MilestoneTableProps {
  milestones: readonly MilestoneItem[]
  /** Pengelola dan Admin: tombol ubah, hapus, dan kotak "Selesai". Lainnya hanya melihat (tombolnya tidak ada). */
  canManage: boolean
  /** Tahun berjalan, supaya tahun hanya ditulis bila berbeda. */
  currentYear: number
  onEdit: (milestone: MilestoneItem) => void
  onDelete: (milestone: MilestoneItem) => void
  onToggleDone: (milestone: MilestoneItem, done: boolean) => void
  /** Ditampilkan bila belum ada milestone. */
  empty: ReactNode
}

/** Daftar milestone sederhana (tab Milestone): nama, sub-proyek, tanggal, dan status; urutan dari server (tanggal). */
export function MilestoneTable({
  milestones,
  canManage,
  currentYear,
  onEdit,
  onDelete,
  onToggleDone,
  empty,
}: MilestoneTableProps) {
  const columns: Column<MilestoneItem>[] = [
    {
      key: 'name',
      header: 'Milestone',
      render: (m) => (
        <span className="ar-milestonetable-name">
          <Icon name="milestone" size={16} />
          <b>{m.name}</b>
        </span>
      ),
    },
    {
      key: 'place',
      header: 'Sub-proyek',
      width: 220,
      render: (m) => milestonePlace(m) || <span className="ar-muted">—</span>,
    },
    {
      key: 'date',
      header: 'Tanggal',
      width: 130,
      render: (m) => formatShortDate(m.date, currentYear),
    },
    {
      key: 'status',
      header: 'Status',
      width: 150,
      render: (m) =>
        canManage ? (
          <Checkbox
            label="Selesai"
            checked={m.isDone}
            onChange={(e) => onToggleDone(m, e.target.checked)}
            aria-label={`Tandai ${m.name} selesai`}
          />
        ) : m.isDone ? (
          'Selesai'
        ) : (
          'Belum selesai'
        ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Aksi',
            headerHidden: true,
            width: 150,
            align: 'right' as const,
            render: (m: MilestoneItem) => (
              <span className="ar-milestonetable-actions">
                <Button size="sm" aria-label={`Ubah ${m.name}`} onClick={() => onEdit(m)}>
                  Ubah
                </Button>
                <Button size="sm" aria-label={`Hapus ${m.name}`} onClick={() => onDelete(m)}>
                  Hapus
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ]

  return (
    <DataTable
      caption="Milestone proyek"
      columns={columns}
      rows={[...milestones]}
      rowKey={(m) => m.id}
      empty={empty}
    />
  )
}
