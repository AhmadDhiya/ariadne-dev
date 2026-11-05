import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextArea } from '@/components/atoms/TextArea'
import { EmailChipsInput } from '@/components/molecules/EmailChipsInput'
import { FormField } from '@/components/molecules/FormField'
import { RadioCard } from '@/components/molecules/RadioCard'
import { Dialog } from '@/components/organisms/Dialog'
import { isValidEmail } from '@/lib/email'
import type { ProjectRole } from '@/types/api'
import './InviteDialog.css'

export const MAX_INVITE_EMAILS = 20
const MAX_MESSAGE = 500

const ROLES: { role: ProjectRole; description: string }[] = [
  { role: 'Pengelola', description: 'Mengatur proyek, sub-proyek, milestone, dan anggota.' },
  { role: 'Anggota', description: 'Membuat dan mengubah task, memberi update dan komentar.' },
  {
    role: 'Tamu',
    description:
      'Hanya melihat progres. Bisa berkomentar dan menandai dengan @, tidak melihat komentar internal.',
  },
]

export interface InviteInput {
  emails: string[]
  role: ProjectRole
  message?: string
}

export interface InviteDialogProps {
  open: boolean
  onClose: () => void
  /** Nama proyek teratas, untuk judul "Undang ke Sentul". */
  projectName: string
  submitting?: boolean
  /** Kesalahan dari server per kolom (emails, role, message). */
  fieldErrors?: Record<string, string>
  /** Kesalahan umum dari server. */
  error?: string
  onSubmit: (input: InviteInput) => void
}

/** Dialog "Undang ke …" (mockup 08): beberapa email, pilihan peran, dan pesan opsional. */
export function InviteDialog({
  open,
  onClose,
  projectName,
  submitting,
  fieldErrors,
  error,
  onSubmit,
}: InviteDialogProps) {
  const formId = useId()
  const roleName = useId()
  const [emails, setEmails] = useState<string[]>([])
  const [role, setRole] = useState<ProjectRole>('Tamu')
  const [message, setMessage] = useState('')
  const [localError, setLocalError] = useState<string>()

  // Isian kembali bersih setiap kali dialog dibuka
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setEmails([])
      setRole('Tamu')
      setMessage('')
      setLocalError(undefined)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (emails.length === 0) {
      setLocalError('Isi minimal satu email.')
    } else if (emails.some((email) => !isValidEmail(email))) {
      setLocalError('Perbaiki atau hapus email yang formatnya tidak valid.')
    } else if (emails.length > MAX_INVITE_EMAILS) {
      setLocalError(`Maksimal ${MAX_INVITE_EMAILS} email sekali kirim.`)
    } else {
      setLocalError(undefined)
      const trimmed = message.trim()
      onSubmit({ emails, role, message: trimmed.length > 0 ? trimmed : undefined })
    }
  }

  const emailError = localError ?? fieldErrors?.emails

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Undang ke ${projectName}`}
      width={520}
      footer={
        <div className="ar-invite-footer">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} icon="mail" disabled={submitting}>
            {submitting ? 'Mengirim…' : 'Kirim undangan'}
          </Button>
        </div>
      }
    >
      <form id={formId} className="ar-invite" onSubmit={submit} noValidate>
        <FormField label="Email" hint="Pisahkan beberapa email dengan koma." error={emailError}>
          {(field) => (
            <EmailChipsInput
              id={field.id}
              aria-describedby={field['aria-describedby']}
              invalid={Boolean(emailError)}
              value={emails}
              onChange={(next) => {
                setEmails(next)
                setLocalError(undefined)
              }}
            />
          )}
        </FormField>

        <fieldset className="ar-invite-roles">
          <legend className="ar-invite-legend">Peran</legend>
          {ROLES.map((r) => (
            <RadioCard
              key={r.role}
              name={roleName}
              value={r.role}
              checked={role === r.role}
              onChange={setRole}
              title={r.role}
              description={r.description}
            />
          ))}
          {fieldErrors?.role ? (
            <p className="ar-invite-error" role="alert">
              {fieldErrors.role}
            </p>
          ) : null}
        </fieldset>

        <FormField
          label={
            <>
              Pesan <span className="ar-invite-optional">(opsional)</span>
            </>
          }
          error={fieldErrors?.message}
        >
          {(field) => (
            <TextArea
              {...field}
              rows={2}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          )}
        </FormField>

        {error ? (
          <p className="ar-invite-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
