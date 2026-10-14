import { useHealth } from '@/api/health'
import { Icon } from '@/components/atoms/Icon'
import { Logo } from '@/components/molecules/Logo'
import './HomePage.css'

/** Halaman sementara Fase 1: memastikan frontend, API, dan database tersambung. */
export function HomePage() {
  const health = useHealth()
  const connected = health.data?.status === 'ok'

  return (
    <main className="home">
      <div className="ar-card home-card">
        <Logo size={40} />
        <h1 className="title home-title">Fondasi aplikasi siap</h1>
        <p className="ar-muted home-text">Halaman Login dan Dashboard dibuat mulai Fase 2.</p>
        <p className="home-status" role="status">
          {health.isPending ? (
            'Memeriksa sambungan ke server…'
          ) : connected ? (
            <>
              <Icon name="check" size={16} className="home-ok" /> Server dan database tersambung
            </>
          ) : (
            <>
              <Icon name="info" size={16} className="home-fail" /> Server atau database belum
              tersambung
            </>
          )}
        </p>
        {import.meta.env.DEV ? <a href="/dev/komponen">Lihat katalog komponen</a> : null}
      </div>
    </main>
  )
}
