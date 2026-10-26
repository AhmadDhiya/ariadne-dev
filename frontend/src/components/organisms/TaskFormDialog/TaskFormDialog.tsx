import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Select } from '@/components/atoms/Select'
import { TextArea } from '@/components/atoms/TextArea'
import { TextInput } from '@/components/atoms/TextInput'
import { DateRangeField } from '@/components/molecules/DateRangeField'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import { PRIORITY_NAMES } from '@/lib/status'
import type { PriorityName } from '@/types/api'
import './TaskFormDialog.css'

export interface TaskFormValues {
  title: string
  description: string
  priority: PriorityName
  projectId: string
  assigneeIds: string[]
  /** "YYYY-MM-DD" atau kosong. */
  start: string
  end: string
  /** Label dipisah koma. */
  labels: string
}

export interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  submitLabel: string
  /** Isian awal (mengubah task) atau bawaan (task baru). */
  initial?: Partial<TaskFormValues>
  /** Pilihan sub-proyek tempat task berada. Kosong = pilihan sub-proyek disembunyikan (mis. sub-task). */
  projects: { id: string; label: string }[]
  /** Anggota proyek yang bisa jadi PIC (tanpa Tamu). */
  people: { id: string; name: string }[]
  /** Label yang sudah ada, sebagai saran ketikan. */
  knownLabels: string[]
  submitting?: boolean
  fieldErrors?: Record<string, string>
  formError?: string
  onSubmit: (values: TaskFormValues) => void
  /** Hanya saat mengubah task. */
  onDelete?: () => void
  /** Hanya saat mengubah task induk: membuka form sub-task. */
  onAddSubtask?: () => void
}

/** Dialog membuat dan mengubah task. Judul wajib; sisanya opsional. Server tetap memvalidasi semuanya. */
export function TaskFormDialog(props: TaskFormDialogProps) {
  const { open, onClose, title, description, submitLabel, submitting, onDelete, onAddSubtask } =
    props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width={560}
      footer={
        <div className="ar-taskform-footer">
          <span className="ar-taskform-extra">
            {onAddSubtask ? (
              <Button variant="ghost" icon="plus" onClick={onAddSubtask}>
                Tambah sub-task
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="ghost" onClick={onDelete}>
                Hapus task
              </Button>
            ) : null}
          </span>
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
  people,
  knownLabels,
  fieldErrors = {},
  formError,
  onSubmit,
  formId,
}: TaskFormDialogProps & { formId: string }) {
  const [values, setValues] = useState<TaskFormValues>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'Medium',
    projectId: initial?.projectId ?? projects[0]?.id ?? '',
    assigneeIds: initial?.assigneeIds ?? [],
    start: initial?.start ?? '',
    end: initial?.end ?? '',
    labels: initial?.labels ?? '',
  })
  const [missingTitle, setMissingTitle] = useState(false)
  const listId = useId()
  const set = (patch: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...patch }))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (values.title.trim() === '') {
      setMissingTitle(true)
      return
    }
    onSubmit({ ...values, title: values.title.trim() })
  }

  const dateError = fieldErrors.dueDate ?? fieldErrors.startDate

  return (
    <form id={formId} className="ar-taskform" onSubmit={submit} noValidate>
      <FormField
        label="Judul"
        required
        error={missingTitle ? 'Judul wajib diisi.' : fieldErrors.title}
      >
        {(field) => (
          <TextInput
            {...field}
            name="title"
            maxLength={200}
            placeholder="mis. Pasang runner GitLab di staging"
            value={values.title}
            onChange={(e) => {
              set({ title: e.target.value })
              setMissingTitle(false)
            }}
          />
        )}
      </FormField>

      <FormField label="Keterangan" error={fieldErrors.description}>
        {(field) => (
          <TextArea
            {...field}
            name="description"
            rows={3}
            maxLength={5000}
            value={values.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        )}
      </FormField>

      <div className="ar-taskform-row">
        {projects.length > 0 ? (
          <FormField label="Sub-proyek" error={fieldErrors.projectId}>
            {(field) => (
              <Select
                {...field}
                name="projectId"
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
        <FormField label="Prioritas" error={fieldErrors.priority}>
          {(field) => (
            <Select
              {...field}
              name="priority"
              value={values.priority}
              onChange={(e) => set({ priority: e.target.value as PriorityName })}
            >
              {PRIORITY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <FormField label="Tanggal" error={dateError}>
        {() => (
          <DateRangeField
            label="Tanggal task"
            start={values.start}
            end={values.end}
            invalid={Boolean(dateError)}
            onChange={(range) => set({ start: range.start, end: range.end })}
          />
        )}
      </FormField>

      <fieldset className="ar-taskform-pic">
        <legend>PIC</legend>
        {people.length === 0 ? (
          <p className="ar-muted">Belum ada anggota proyek yang bisa jadi PIC.</p>
        ) : (
          <div className="ar-taskform-people">
            {people.map((p) => (
              <Checkbox
                key={p.id}
                label={p.name}
                checked={values.assigneeIds.includes(p.id)}
                onChange={(e) =>
                  set({
                    assigneeIds: e.target.checked
                      ? [...values.assigneeIds, p.id]
                      : values.assigneeIds.filter((id) => id !== p.id),
                  })
                }
              />
            ))}
          </div>
        )}
        {fieldErrors.assigneeIds ? (
          <p className="ar-taskform-error" role="alert">
            {fieldErrors.assigneeIds}
          </p>
        ) : null}
      </fieldset>

      <FormField
        label="Label"
        hint="Pisahkan dengan koma, mis. UAT, API."
        error={fieldErrors.labels}
      >
        {(field) => (
          <>
            <TextInput
              {...field}
              name="labels"
              list={listId}
              autoComplete="off"
              value={values.labels}
              onChange={(e) => set({ labels: e.target.value })}
            />
            <datalist id={listId}>
              {knownLabels.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
          </>
        )}
      </FormField>

      {formError ? (
        <p className="ar-taskform-error" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  )
}
