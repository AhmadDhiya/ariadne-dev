import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { TextInput } from '@/components/atoms/TextInput'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import './FormDialog.css'

export interface FieldDef {
  name: string
  label: string
  kind?: 'text' | 'email' | 'checkbox'
  hint?: ReactNode
  maxLength?: number
  placeholder?: string
  autoComplete?: string
}

export type FormValues = Record<string, string | boolean>

export interface FormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  fields: FieldDef[]
  initialValues?: FormValues
  submitLabel: string
  onSubmit: (values: FormValues) => void | Promise<void>
  submitting?: boolean
  /** Pesan per kolom dari server (mis. email sudah terdaftar). */
  fieldErrors?: Record<string, string>
  /** Kesalahan umum (mis. koneksi putus). */
  formError?: string
}

/**
 * Dialog berisi form sederhana: "Buat tim", "Ubah tim", "Tambah sub-proyek", "Buat proyek", "Tambah pengguna".
 * Bidang teks wajib diisi (pemeriksaan di sini hanya bantuan; server tetap memvalidasi, pedoman C3).
 */
export function FormDialog(props: FormDialogProps) {
  const { open, onClose, title, description, submitLabel, submitting } = props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} disabled={submitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      {/* Isi dibuat hanya saat dialog terbuka, jadi isian kembali bersih setiap kali dibuka */}
      {open ? <FormBody {...props} formId={formId} /> : null}
    </Dialog>
  )
}

function FormBody({
  fields,
  initialValues,
  onSubmit,
  fieldErrors = {},
  formError,
  formId,
}: FormDialogProps & { formId: string }) {
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, initialValues?.[f.name] ?? (f.kind === 'checkbox' ? false : '')]),
    ),
  )
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const errors = { ...fieldErrors, ...localErrors }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const missing: Record<string, string> = {}
    for (const f of fields) {
      if (f.kind !== 'checkbox' && String(values[f.name] ?? '').trim() === '') {
        missing[f.name] = `${f.label} wajib diisi.`
      }
    }
    setLocalErrors(missing)
    if (Object.keys(missing).length > 0) return
    await onSubmit(values)
  }

  return (
    <form id={formId} className="ar-formdialog" onSubmit={submit} noValidate>
      {fields.map((f) =>
        f.kind === 'checkbox' ? (
          <Checkbox
            key={f.name}
            label={f.label}
            checked={Boolean(values[f.name])}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))}
          />
        ) : (
          <FormField key={f.name} label={f.label} hint={f.hint} error={errors[f.name]} required>
            {(field) => (
              <TextInput
                {...field}
                name={f.name}
                type={f.kind === 'email' ? 'email' : 'text'}
                maxLength={f.maxLength}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete ?? 'off'}
                value={String(values[f.name] ?? '')}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  setLocalErrors((l) => ({ ...l, [f.name]: '' }))
                }}
              />
            )}
          </FormField>
        ),
      )}
      {formError ? (
        <p className="ar-formdialog-error" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  )
}
