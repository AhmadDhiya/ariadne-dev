import { useLocation, useNavigate } from 'react-router'
import { useProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'

const SOON: Record<string, { title: string; text: string }> = {
  tabel: { title: 'Tabel task segera hadir', text: 'Tabel task per sub-proyek dibuat di Fase 3.' },
  gantt: { title: 'Gantt segera hadir', text: 'Gantt dan beban kerja per orang dibuat di Fase 6.' },
  milestone: {
    title: 'Milestone segera hadir',
    text: 'Daftar dan pengelolaan milestone dibuat di Fase 6.',
  },
}

/** Isi sementara tab Tabel, Gantt, dan Milestone sampai fitur itu dibuat. Tab Anggota sudah berfungsi. */
export function ProjectSoonPage() {
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const segment = useLocation().pathname.split('/')[3] ?? 'tabel'
  const info = SOON[segment] ?? SOON.tabel

  return (
    <div className="ar-card">
      <EmptyState
        icon="info"
        title={info?.title ?? 'Segera hadir'}
        description={info?.text}
        action={
          <Button onClick={() => void navigate(`/proyek/${project.id}/anggota`)}>
            Lihat anggota proyek
          </Button>
        }
      />
    </div>
  )
}
