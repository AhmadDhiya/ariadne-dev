import { Button } from '@/components/atoms/Button'
import { Label } from '@/components/atoms/Label'
import { DataTable, type Column } from '@/components/molecules/DataTable'
import { EmptyState } from '@/components/molecules/EmptyState'
import type { ProjectNode } from '@/types/api'
import './ProjectsTable.css'

export interface ProjectsTableProps {
  /** Daftar datar urut pohon (induk sebelum anak-anaknya). */
  projects: ProjectNode[]
  onOpen: (project: ProjectNode) => void
  onRename: (project: ProjectNode) => void
  onArchive: (project: ProjectNode) => void
}

const LEVEL_LABEL = ['Proyek', 'Sub-proyek', 'Sub-sub-proyek']

/** Daftar semua proyek untuk Admin (halaman Pengaturan): buka, ubah nama, dan arsipkan. */
export function ProjectsTable({ projects, onOpen, onRename, onArchive }: ProjectsTableProps) {
  const columns: Column<ProjectNode>[] = [
    {
      key: 'name',
      header: 'Nama proyek',
      render: (p) => (
        <span className="ar-projects-name" style={{ paddingLeft: p.depth * 20 }}>
          {p.name}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Kode',
      width: 110,
      render: (p) => (p.code ? <span className="ar-id">{p.code}</span> : null),
    },
    {
      key: 'level',
      header: 'Tingkat',
      width: 150,
      render: (p) => <Label>{LEVEL_LABEL[p.depth] ?? 'Sub-proyek'}</Label>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      headerHidden: true,
      width: 290,
      align: 'right',
      render: (p) => (
        <span className="ar-projects-actions">
          <Button size="sm" variant="ghost" aria-label={`Buka ${p.name}`} onClick={() => onOpen(p)}>
            Buka
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Ubah nama ${p.name}`}
            onClick={() => onRename(p)}
          >
            Ubah nama
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Arsipkan ${p.name}`}
            onClick={() => onArchive(p)}
          >
            Arsipkan
          </Button>
        </span>
      ),
    },
  ]

  return (
    <section className="ar-card ar-projects">
      <DataTable
        caption="Semua proyek"
        columns={columns}
        rows={projects}
        rowKey={(p) => p.id}
        empty={
          <EmptyState
            icon="folder"
            title="Belum ada proyek"
            description="Buat proyek pertama, lalu tambahkan pengelolanya."
          />
        }
      />
    </section>
  )
}
