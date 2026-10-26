import { useAppContext } from '@/app/context'
import { EmptyState } from '@/components/molecules/EmptyState'
import { PageHeader } from '@/components/molecules/PageHeader'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** Sementara (Fase 2): dashboard pribadi dengan kartu ringkasan dan daftar "Hari Ini" dibuat di Fase 5. */
export function DashboardPage() {
  const { me } = useAppContext()
  useDocumentTitle('Dashboard')

  return (
    <>
      <PageHeader title={`Halo, ${me.displayName}`} />
      <div className="ar-card">
        <EmptyState
          icon="dashboard"
          title="Dashboard pribadi segera hadir"
          description="Kartu ringkasan, daftar “Hari Ini”, dan timeline pribadi Anda dibuat di Fase 5, setelah task tersedia."
        />
      </div>
    </>
  )
}
