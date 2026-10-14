import { useOutletContext } from 'react-router'
import type { Me, ProjectDetail } from '@/types/api'

/** Data yang diberikan AppLayoutPage ke semua halaman setelah login (hanya dirender bila sudah login). */
export interface AppContext {
  me: Me
}

export const useAppContext = () => useOutletContext<AppContext>()

/** Data yang diberikan ProjectPage ke tab-tab proyek. */
export interface ProjectContext extends AppContext {
  project: ProjectDetail
}

export const useProjectContext = () => useOutletContext<ProjectContext>()
