import { EmptyState } from '@/components/molecules/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** Halaman tidak ada, atau tidak boleh diketahui keberadaannya: tampilannya sama untuk keduanya. */
export function NotFoundPage() {
  useDocumentTitle('Halaman tidak ditemukan')
  return (
    <div className="ar-card">
      <EmptyState
        title="Halaman tidak ditemukan"
        description="Alamat ini tidak ada atau Anda tidak punya akses ke halaman ini."
        action={<a href="/">Kembali ke beranda</a>}
      />
    </div>
  )
}
