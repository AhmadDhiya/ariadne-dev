import { Navigate, createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import { ToastProvider } from '@/app/ToastProvider'
import { AcceptInvitationPage } from '@/pages/AcceptInvitationPage'
import { AppLayoutPage } from '@/pages/AppLayoutPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ProjectMembersPage } from '@/pages/ProjectMembersPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { ProjectTablePage } from '@/pages/ProjectTablePage'
import { ProjectGanttPage } from '@/pages/ProjectGanttPage'
import { ProjectMilestonesPage } from '@/pages/ProjectMilestonesPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { TimelineTimPage } from '@/pages/TimelineTimPage'

// Katalog komponen hanya ada saat pengembangan: di build produksi cabang ini dihapus
// seluruhnya, termasuk kodenya (pedoman A6). scripts/check memastikannya.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/komponen',
        lazy: async () => ({
          Component: (await import('@/pages/DevKomponenPage')).DevKomponenPage,
        }),
      },
    ]
  : []

const router = createBrowserRouter([
  // Halaman tanpa login
  { path: '/masuk', Component: LoginPage },
  { path: '/lupa-password', Component: ForgotPasswordPage },
  { path: '/reset-password', Component: ResetPasswordPage },
  { path: '/undangan', Component: AcceptInvitationPage },
  ...devRoutes,

  // Semua halaman setelah login lewat AppLayoutPage (periksa sesi + sidebar + topbar)
  {
    Component: AppLayoutPage,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'timeline-tim', Component: TimelineTimPage },
      { path: 'dashboard/:userId', Component: DashboardPage },
      { path: 'tim', Component: TeamsPage },
      { path: 'tim/:teamId', Component: TeamsPage },
      { path: 'pengaturan', Component: SettingsPage },
      { path: 'notifikasi', Component: NotificationsPage },
      {
        path: 'proyek/:projectId',
        Component: ProjectPage,
        children: [
          { index: true, element: <Navigate to="tabel" replace /> },
          { path: 'tabel', Component: ProjectTablePage },
          { path: 'gantt', Component: ProjectGanttPage },
          { path: 'milestone', Component: ProjectMilestonesPage },
          { path: 'anggota', Component: ProjectMembersPage },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
])

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
