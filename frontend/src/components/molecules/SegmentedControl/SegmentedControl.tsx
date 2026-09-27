import { cx } from '@/lib/cx'
import './SegmentedControl.css'

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Nama grup untuk pembaca layar, mis. "Skala waktu". */
  label: string
}

/**
 * Kelompok tombol pilihan untuk skala (Hari / Minggu / Bulan). Tabs mengganti tampilan;
 * kontrol ini hanya mengganti skala.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div className="ar-seg" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={cx('ar-seg-btn', selected && 'is-selected')}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
