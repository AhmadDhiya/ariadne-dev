import { useAppContext } from '@/app/context'
import { EmptyState } from '@/components/molecules/EmptyState'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** Sementara (Fase 2): Timeline Tim untuk supervisor dibuat di Fase 7. Server sudah membatasi siapa yang boleh. */
export function TimelineTimPage() {
  const { me } = useAppContext()
  useDocumentTitle('Timeline Tim')
  if (!me.isSupervisor) return <NotFoundPage />

  return (
    <>
      <PageHeader title="Timeline Tim" />
      <div className="ar-card">
        <EmptyState
          icon="timeline"
          title="Timeline Tim segera hadir"
          description="Beban kerja per orang dan pemindahan task dibuat di Fase 7, setelah task dan Gantt tersedia."
        />
      </div>
    </>
  )
}
