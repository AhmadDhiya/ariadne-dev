import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { DateRangeField, type DateRange } from '@/components/molecules/DateRangeField'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import './ChangeDatesDialog.css'

export interface ChangeDatesDialogProps {
  open: boolean
  onClose: () => void
  /** Task yang diubah tanggalnya, mis. "SEN-150 Uji beban Dispatch". */
  taskLabel: string
  /** Tanggal sekarang ("YYYY-MM-DD" atau kosong). */
  initial: DateRange
  /** Tanggal kosong dikirim sebagai null (tanggal dihapus). */
  onSubmit: (dates: { startDate: string | null; dueDate: string | null }) => void
  submitting?: boolean
  /** Pesan dari server (tanggal selesai sebelum mulai, dan sebagainya). */
  error?: string
}

/** Dialog kecil "Ubah tanggal" dari baris Timeline Tim dan dashboard anggota. */
export function ChangeDatesDialog(props: ChangeDatesDialogProps) {
  const { open, onClose, taskLabel, submitting } = props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ubah tanggal"
      description={taskLabel}
      width={480}
      footer={
        <div className="ar-changedates-footer">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} disabled={submitting}>
            Simpan tanggal
          </Button>
        </div>
      }
    >
      {open ? <DatesForm {...props} formId={formId} /> : null}
    </Dialog>
  )
}

function DatesForm({
  initial,
  onSubmit,
  error,
  formId,
}: ChangeDatesDialogProps & { formId: string }) {
  const [range, setRange] = useState<DateRange>(initial)
  const [localError, setLocalError] = useState<string>()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (range.start && range.end && range.end < range.start) {
      setLocalError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    onSubmit({ startDate: range.start || null, dueDate: range.end || null })
  }

  return (
    <form id={formId} onSubmit={submit} noValidate>
      <FormField label="Tanggal task" error={localError ?? error}>
        {() => (
          <DateRangeField
            label="Tanggal task"
            start={range.start}
            end={range.end}
            invalid={Boolean(localError ?? error)}
            onChange={(next) => {
              setRange(next)
              setLocalError(undefined)
            }}
          />
        )}
      </FormField>
    </form>
  )
}
