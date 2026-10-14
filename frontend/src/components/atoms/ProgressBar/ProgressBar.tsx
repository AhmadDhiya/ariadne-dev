import './ProgressBar.css'

export interface ProgressBarProps {
  /** 0–100. */
  value: number
  /** Nama untuk pembaca layar, mis. "Progres Sentul". Angka persennya ditampilkan di luar komponen ini. */
  label: string
  width?: number
}

/** Batang progres proyek (header proyek: "58%"). */
export function ProgressBar({ value, label, width = 120 }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <span
      className="ar-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      style={{ width }}
    >
      <span className="ar-progress-fill" style={{ width: `${clamped}%` }} />
    </span>
  )
}
