import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
  { path: '/', Component: HomePage },
  ...devRoutes,
  { path: '*', Component: NotFoundPage },
])

export function App() {
  return <RouterProvider router={router} />
}
