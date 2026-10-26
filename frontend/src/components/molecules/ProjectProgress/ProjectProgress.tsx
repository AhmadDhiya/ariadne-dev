import { ProgressBar } from '@/components/atoms/ProgressBar'
import './ProjectProgress.css'

export interface ProjectProgressProps {
  projectName: string
  done: number
  total: number
  /** Persen bulat, dihitung server. */
  percent: number
}

/** Progres proyek di header: bar, "58%", dan "41 dari 71 task selesai" (sub-task tidak dihitung). */
export function ProjectProgress({ projectName, done, total, percent }: ProjectProgressProps) {
  return (
    <div className="ar-projprogress">
      <ProgressBar value={percent} label={`Progres ${projectName}`} width={120} />
      <span className="ar-projprogress-pct">{percent}%</span>
      <span className="ar-projprogress-text">
        {total === 0 ? 'Belum ada task' : `${done} dari ${total} task selesai`}
      </span>
    </div>
  )
}
