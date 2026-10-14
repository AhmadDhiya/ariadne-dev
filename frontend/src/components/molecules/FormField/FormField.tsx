import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './FormField.css'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  /** Diisi saat ada kesalahan; atom TextInput/TextArea menampilkannya dengan garis merah. */
  'aria-invalid'?: true
  required?: boolean
}

export interface FormFieldProps {
  label: ReactNode
  /** Konten kecil di kanan label, mis. tautan "Lupa password?". */
  labelAside?: ReactNode
  hint?: ReactNode
  /** Pesan kesalahan; diumumkan ke pembaca layar. */
  error?: ReactNode
  required?: boolean
  className?: string
  /** Menerima id dan atribut aksesibilitas untuk dipasang ke input. */
  children: (control: FieldControlProps) => ReactNode
}

/** Label + input + petunjuk/kesalahan yang terhubung dengan benar untuk pembaca layar. */
export function FormField({
  label,
  labelAside,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cx('ar-field', className)}>
      <div className="ar-field-top">
        <label htmlFor={id} className="ar-field-label">
          {label}
          {required ? (
            <span className="ar-field-req" aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </label>
        {labelAside}
      </div>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        required,
      })}
      {hint ? (
        <p id={hintId} className="ar-field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="ar-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
