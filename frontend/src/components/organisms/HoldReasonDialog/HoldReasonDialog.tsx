import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { StatusPill } from '@/components/atoms/StatusPill'
import { TextArea } from '@/components/atoms/TextArea'
import { TextInput } from '@/components/atoms/TextInput'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import type { HeldStatusKey } from '@/lib/status'
import './HoldReasonDialog.css'

export interface HoldReasonValues {
  holdReason: string
  /** Orang di proyek yang ditunggu, atau null. */
  waitingOnUserId: string | null
  /** Pihak luar yang ditunggu (mis. "Klien, tim IT"); kosong bila memilih orang. */
  waitingOnText: string
}

export interface HoldReasonDialogProps {
  open: boolean
  onClose: () => void
  /** Status tertahan yang dipilih (Blocked, On Hold, On Request). */
  status: HeldStatusKey
  /** Task yang diubah, mis. "SEN-115 Pipeline GitLab IRS". */
  taskLabel: string
  /** Anggota proyek yang bisa dipilih sebagai yang ditunggu. */
  people: { id: string; name: string }[]
  submitting?: boolean
  fieldErrors?: Record<string, string>
  formError?: string
  onSubmit: (values: HoldReasonValues) => void
}

const OTHER = '__other'

/**
 * Dialog yang muncul saat task dipindah ke status tertahan: alasan wajib diisi, "menunggu siapa" opsional.
 * Server menolak status tertahan tanpa alasan; dialog ini hanya membantu (pedoman C3).
 */
export function HoldReasonDialog(props: HoldReasonDialogProps) {
  const { open, onClose, status, taskLabel, submitting } = props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="ar-hold-dialog-title">
          Ubah status ke <StatusPill status={status} />
        </span>
      }
      description={taskLabel}
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} disabled={submitting}>
            Simpan status
          </Button>
        </>
      }
    >
      {open ? <HoldBody {...props} formId={formId} /> : null}
    </Dialog>
  )
}

function HoldBody({
  people,
  fieldErrors = {},
  formError,
  onSubmit,
  formId,
}: HoldReasonDialogProps & { formId: string }) {
  const [reason, setReason] = useState('')
  const [waiting, setWaiting] = useState('')
  const [other, setOther] = useState('')
  const [missing, setMissing] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (reason.trim() === '') {
      setMissing(true)
      return
    }
    onSubmit({
      holdReason: reason.trim(),
      waitingOnUserId: waiting && waiting !== OTHER ? waiting : null,
      waitingOnText: waiting === OTHER ? other.trim() : '',
    })
  }

  const reasonError = missing ? 'Alasan tertahan wajib diisi.' : fieldErrors.holdReason

  return (
    <form id={formId} className="ar-hold-dialog" onSubmit={submit} noValidate>
      <FormField label="Alasan tertahan" required error={reasonError}>
        {(field) => (
          <TextArea
            {...field}
            name="holdReason"
            rows={3}
            maxLength={1000}
            placeholder="mis. Runner belum bisa mengakses server staging"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setMissing(false)
            }}
          />
        )}
      </FormField>
      <FormField
        label="Menunggu siapa"
        hint="Boleh dikosongkan."
        error={fieldErrors.waitingOnUserId}
      >
        {(field) => (
          <Select
            {...field}
            name="waitingOn"
            value={waiting}
            onChange={(e) => setWaiting(e.target.value)}
          >
            <option value="">Tidak ada</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={OTHER}>Pihak lain (ketik sendiri)</option>
          </Select>
        )}
      </FormField>
      {waiting === OTHER ? (
        <FormField label="Pihak yang ditunggu" error={fieldErrors.waitingOnText}>
          {(field) => (
            <TextInput
              {...field}
              name="waitingOnText"
              maxLength={200}
              placeholder="mis. Klien, tim IT"
              value={other}
              onChange={(e) => setOther(e.target.value)}
            />
          )}
        </FormField>
      ) : null}
      {formError ? (
        <p className="ar-hold-dialog-error" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  )
}
