import { EmptyState } from '@/components/molecules/EmptyState'

export function NotFoundPage() {
  return (
    <main>
      <EmptyState
        title="Halaman tidak ditemukan"
        description="Alamat ini tidak ada atau Anda tidak punya akses ke halaman ini."
        action={<a href="/">Kembali ke beranda</a>}
      />
    </main>
  )
}
