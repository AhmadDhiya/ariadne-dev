import { useEffect } from 'react'
import { Navigate, Outlet, matchPath, useLocation, useNavigate } from 'react-router'
import { useLogout, useMe, useUpdateMe } from '@/api/auth'
import { useProjectTree } from '@/api/projects'
import type { AppContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { Banner } from '@/components/molecules/Banner'
import { EmptyState } from '@/components/molecules/EmptyState'
import { Sidebar, type TopLevelKey } from '@/components/organisms/Sidebar'
import { Topbar } from '@/components/organisms/Topbar'
import { AppShell } from '@/components/templates/AppShell'
import { useTheme } from '@/hooks/useTheme'
import { TaskDrawerPage } from '@/pages/TaskDrawerPage'
import { roleSubtitle } from '@/lib/roles'

function topLevelKey(pathname: string): TopLevelKey | null {
  if (pathname === '/') return 'dashboard'
  if (matchPath('/timeline-tim/*', pathname)) return 'timeline'
  if (matchPath('/tim/*', pathname)) return 'tim'
  if (matchPath('/pengaturan/*', pathname)) return 'pengaturan'
  return null
}

/**
 * Pintu semua halaman setelah login: memeriksa sesi, lalu memasang sidebar dan topbar. Belum login →
 * ke halaman masuk (dengan "next"). Menu yang bukan hak pengguna disembunyikan; server tetap memeriksa.
 */
export function AppLayoutPage() {
  const me = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()
  const updateMe = useUpdateMe()
  const { theme, setTheme } = useTheme()
  const tree = useProjectTree(Boolean(me.data))

  // Pilihan tema yang tersimpan di akun berlaku saat login di perangkat mana pun
  const serverTheme = me.data?.theme
  useEffect(() => {
    if (serverTheme) setTheme(serverTheme)
  }, [serverTheme, setTheme])

  if (me.isPending) {
    return (
      <p role="status" style={{ padding: 24 }}>
        Memuat…
      </p>
    )
  }

  if (me.isError) {
    return (
      <EmptyState
        icon="info"
        title="Tidak bisa terhubung ke server"
        description="Periksa koneksi Anda, lalu coba lagi."
        action={<Button onClick={() => void me.refetch()}>Coba lagi</Button>}
      />
    )
  }

  if (!me.data) {
    const next = `${location.pathname}${location.search}`
    return (
      <Navigate to={next === '/' ? '/masuk' : `/masuk?next=${encodeURIComponent(next)}`} replace />
    )
  }

  const user = me.data
  const projectMatch = matchPath('/proyek/:id/*', location.pathname)
  const context: AppContext = { me: user }

  return (
    <AppShell
      sidebar={
        <Sidebar
          projects={tree.data ?? []}
          activeKey={topLevelKey(location.pathname)}
          activeProjectId={projectMatch?.params.id ?? null}
          showTimeline={user.isSupervisor}
          showTeams={!user.isGuestOnly}
          showSettings={user.isAdmin}
          onNavigate={(href) => void navigate(href)}
        />
      }
      topbar={
        <Topbar
          userName={user.displayName}
          subtitle={roleSubtitle(user)}
          guest={user.isGuestOnly}
          theme={theme}
          onThemeChange={(next) => {
            setTheme(next)
            updateMe.mutate({ theme: next })
          }}
          onLogout={() =>
            logout.mutate(undefined, {
              onSettled: () => void navigate('/masuk', { replace: true }),
            })
          }
        />
      }
      banner={
        user.isGuestOnly ? (
          <Banner kind="guest">
            Anda melihat sebagai <b>Tamu</b>. Anda bisa berkomentar dan menandai anggota dengan @.
          </Banner>
        ) : undefined
      }
    >
      <Outlet context={context} />
      <TaskDrawerPage />
    </AppShell>
  )
}
