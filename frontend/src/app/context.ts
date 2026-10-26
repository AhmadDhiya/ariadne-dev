import type { UseQueryResult } from '@tanstack/react-query'
import { useOutletContext } from 'react-router'
import type { TaskFilters } from '@/lib/taskFilters'
import type { Me, ProjectDetail, TaskList } from '@/types/api'

/** Data yang diberikan AppLayoutPage ke semua halaman setelah login (hanya dirender bila sudah login). */
export interface AppContext {
  me: Me
}

export const useAppContext = () => useOutletContext<AppContext>()

/** Data yang diberikan ProjectPage ke tab-tab proyek. */
export interface ProjectContext extends AppContext {
  project: ProjectDetail
  /** Task proyek ini (sudah disaring oleh `filters` bila sedang di tab Tabel). */
  tasks: UseQueryResult<TaskList>
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  /** Membuka dialog "Tambah task" yang dimiliki ProjectPage (tombol di header). */
  onCreateTask: () => void
}

export const useProjectContext = () => useOutletContext<ProjectContext>()
