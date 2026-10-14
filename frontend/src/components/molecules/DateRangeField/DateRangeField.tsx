import { TextInput } from '@/components/atoms/TextInput'
import './DateRangeField.css'

export interface DateRange {
  /** "YYYY-MM-DD" atau kosong. */
  start: string
  end: string
}

export interface DateRangeFieldProps extends DateRange {
  onChange: (range: DateRange) => void
  /** Nama grup untuk pembaca layar, mis. "Tanggal task". */
  label: string
  invalid?: boolean
  disabled?: boolean
}

/** Tanggal mulai – selesai. Selesai tidak bisa dipilih sebelum mulai; server tetap memeriksa. */
export function DateRangeField({
  start,
  end,
  onChange,
  label,
  invalid,
  disabled,
}: DateRangeFieldProps) {
  return (
    <div className="ar-daterange" role="group" aria-label={label}>
      <TextInput
        type="date"
        aria-label="Mulai"
        value={start}
        max={end || undefined}
        invalid={invalid}
        disabled={disabled}
        onChange={(e) => onChange({ start: e.target.value, end })}
      />
      <span className="ar-daterange-sep" aria-hidden>
        –
      </span>
      <TextInput
        type="date"
        aria-label="Selesai"
        value={end}
        min={start || undefined}
        invalid={invalid}
        disabled={disabled}
        onChange={(e) => onChange({ start, end: e.target.value })}
      />
    </div>
  )
}
