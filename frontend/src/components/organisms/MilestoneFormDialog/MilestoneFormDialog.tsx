import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Select } from '@/components/atoms/Select'
import { TextInput } from '@/components/atoms/TextInput'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import './MilestoneFormDialog.css'

export interface MilestoneFormValues {
  name: string
  /** "YYYY-MM-DD" */
  date: string
  projectId: string
  isDone: boolean
}

export interface MilestoneFormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  submitLabel: string
  /** Isian awal (mengubah) atau bawaan (baru). */
  initial?: Partial<MilestoneFormValues>
  /** Proyek dan sub-proyek tempat milestone bisa diletakkan. Satu pilihan atau kurang: pilihannya disembunyikan. */
  projects: readonly { id: string; label: string }[]
  /** Kotak "Sudah selesai" hanya muncul saat mengubah. */
  showDone?: boolean
  submitting?: boolean
  fieldErrors?: Record<string, string>
  formError?: string
  onSubmit: (values: MilestoneFormValues) => void
}

/** Dialog membuat dan mengubah milestone: nama, tanggal, sub-proyek, dan (saat mengubah) tanda selesai. Server tetap memvalidasi. */
export function MilestoneFormDialog(props: MilestoneFormDialogProps) {
  const { open, onClose, title, submitLabel, submitting } = props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width={480}
      footer={
        <div className="ar-milestoneform-footer">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} disabled={submitting}>
            {submitLabel}
          </Button>
        </div>
      }
    >
      {open ? <FormBody {...props} formId={formId} /> : null}
    </Dialog>
  )
}

function FormBody({
  initial,
  projects,
  showDone,
  fieldErrors = {},
  formError,
  onSubmit,
  formId,
}: MilestoneFormDialogProps & { formId: string }) {
  const [values, setValues] = useState<MilestoneFormValues>({
    name: initial?.name ?? '',
    date: initial?.date ?? '',
    projectId: initial?.projectId ?? projects[0]?.id ?? '',
    isDone: initial?.isDone ?? false,
  })
  const [missing, setMissing] = useState<{ name?: boolean; date?: boolean }>({})
  const set = (patch: Partial<MilestoneFormValues>) => setValues((v) => ({ ...v, ...patch }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = values.name.trim()
    if (name === '' || values.date === '') {
      setMissing({ name: name === '', date: values.date === '' })
      return
    }
    onSubmit({ ...values, name })
  }

  return (
    <form id={formId} className="ar-milestoneform" onSubmit={submit} noValidate>
      <FormField
        label="Nama"
        required
        error={missing.name ? 'Nama wajib diisi.' : fieldErrors.name}
      >
        {(field) => (
          <TextInput
            {...field}
            maxLength={100}
            placeholder="mis. UAT SLMS"
            value={values.name}
            onChange={(e) => {
              set({ name: e.target.value })
              setMissing((m) => ({ ...m, name: false }))
            }}
          />
        )}
      </FormField>
      <FormField
        label="Tanggal"
        required
        error={missing.date ? 'Tanggal wajib diisi.' : fieldErrors.date}
      >
        {(field) => (
          <TextInput
            {...field}
            type="date"
            value={values.date}
            onChange={(e) => {
              set({ date: e.target.value })
              setMissing((m) => ({ ...m, date: false }))
            }}
          />
        )}
      </FormField>
      {projects.length > 1 ? (
        <FormField label="Sub-proyek" error={fieldErrors.projectId}>
          {(field) => (
            <Select
              {...field}
              value={values.projectId}
              onChange={(e) => set({ projectId: e.target.value })}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      ) : null}
      {showDone ? (
        <Checkbox
          label="Sudah selesai"
          checked={values.isDone}
          onChange={(e) => set({ isDone: e.target.checked })}
        />
      ) : null}
      {formError ? (
        <p className="ar-milestoneform-error" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  )
}
