import { useId, type ReactNode } from 'react'
import { Radio } from '@/components/atoms/Radio'
import { cx } from '@/lib/cx'
import './RadioCard.css'

export interface RadioCardProps<T extends string> {
  name: string
  value: T
  checked: boolean
  onChange: (value: T) => void
  title: ReactNode
  description?: ReactNode
  disabled?: boolean
}

/** Pilihan berbentuk kartu dengan judul dan penjelasan (peran di dialog Undang). */
export function RadioCard<T extends string>({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  disabled,
}: RadioCardProps<T>) {
  const descId = useId()
  return (
    <label className={cx('ar-radiocard', checked && 'is-selected', disabled && 'is-disabled')}>
      <Radio
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        aria-describedby={description ? descId : undefined}
      />
      <span className="ar-radiocard-text">
        <span className="ar-radiocard-title">{title}</span>
        {description ? (
          <span id={descId} className="ar-radiocard-desc">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
