import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextArea } from '@/components/atoms/TextArea'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import './AddUpdateDialog.css'

export interface AddUpdateDialogProps {
  open: boolean
  onClose: () => void
  /** Task yang diberi update, mis. "SEN-115 Pipeline GitLab IRS". */
  taskLabel: string
  /** Mengirim update. Selama dikirim, tombol mati. */
  onSubmit: (body: string) => void
  submitting?: boolean
  /** Pesan dari server (teks terlalu panjang, tidak boleh menulis di task ini, dan sebagainya). */
  error?: string
}

/**
 * Dialog kecil "Tambah update" dari baris dashboard: satu kotak teks, tanpa pindah halaman. Untuk komentar, catatan
 * internal, atau @mention, pakai drawer detail task.
 */
export function AddUpdateDialog(props: AddUpdateDialogProps) {
  const { open, onClose, taskLabel, submitting } = props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah update"
      description={taskLabel}
      width={520}
      footer={
        <div className="ar-addupdate-footer">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} disabled={submitting}>
            Kirim update
          </Button>
        </div>
      }
    >
      {open ? <UpdateForm {...props} formId={formId} /> : null}
    </Dialog>
  )
}

function UpdateForm({ onSubmit, error, formId }: AddUpdateDialogProps & { formId: string }) {
  const [text, setText] = useState('')
  const [missing, setMissing] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (body === '') {
      setMissing(true)
      return
    }
    onSubmit(body)
  }

  return (
    <form id={formId} onSubmit={submit} noValidate>
      <FormField
        label="Update"
        required
        hint="Tampil di kolom Update terakhir tabel proyek."
        error={missing ? 'Isi update wajib diisi.' : error}
      >
        {(field) => (
          <TextArea
            {...field}
            autoFocus
            rows={4}
            maxLength={5000}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setMissing(false)
            }}
          />
        )}
      </FormField>
    </form>
  )
}
