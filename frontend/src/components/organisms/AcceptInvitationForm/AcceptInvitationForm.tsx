import { useState, type FormEvent, type MouseEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextInput } from '@/components/atoms/TextInput'
import { AuthFormShell } from '@/components/molecules/AuthFormShell'
import { FormField } from '@/components/molecules/FormField'
import { MIN_PASSWORD_LENGTH } from '@/components/organisms/ResetPasswordForm'
import type { ProjectRole } from '@/types/api'
import './AcceptInvitationForm.css'

export interface AcceptInvitationFormProps {
  email: string
  projectName: string
  invitedBy: string
  role: ProjectRole
  message?: string | null
  /** Email itu sudah punya akun: tidak perlu nama dan password baru. */
  hasAccount: boolean
  onSubmit: (input: { displayName: string; password: string }) => void
  submitting?: boolean
  /** Kesalahan dari server per kolom (displayName, password). */
  fieldErrors?: Record<string, string>
  error?: string
  /** Sudah diterima oleh akun yang ada: tampilkan ajakan masuk. */
  joined?: boolean
  loginHref: string
  onNavigate: (href: string) => void
}

/** Terima undangan (Keputusan 2): membuat nama dan password sekali, lalu langsung masuk. */
export function AcceptInvitationForm({
  email,
  projectName,
  invitedBy,
  role,
  message,
  hasAccount,
  onSubmit,
  submitting,
  fieldErrors,
  error,
  joined,
  loginHref,
  onNavigate,
}: AcceptInvitationFormProps) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<{ field: 'name' | 'password'; text: string }>()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (hasAccount) {
      onSubmit({ displayName: '', password: '' })
    } else if (name.trim().length === 0) {
      setLocalError({ field: 'name', text: 'Nama wajib diisi.' })
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError({
        field: 'password',
        text: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`,
      })
    } else if (password !== confirm) {
      setLocalError({ field: 'password', text: 'Konfirmasi password tidak sama.' })
    } else {
      setLocalError(undefined)
      onSubmit({ displayName: name.trim(), password })
    }
  }

  function goLogin(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    onNavigate(loginHref)
  }

  const intro = (
    <>
      <b>{invitedBy}</b> mengundang <b>{email}</b> ke proyek <b>{projectName}</b> sebagai {role}.
    </>
  )

  if (joined) {
    return (
      <AuthFormShell
        title="Undangan diterima"
        subtitle={`Masuk dengan akun Anda untuk membuka ${projectName}.`}
      >
        <Button
          variant="primary"
          className="ar-authform-submit"
          onClick={() => onNavigate(loginHref)}
        >
          Ke halaman masuk
        </Button>
      </AuthFormShell>
    )
  }

  return (
    <AuthFormShell
      title={`Bergabung ke ${projectName}`}
      subtitle={intro}
      footnote={
        <a href={loginHref} onClick={goLogin}>
          Sudah punya akun? Masuk
        </a>
      }
    >
      <form className="ar-authform" onSubmit={submit} noValidate>
        {message ? <blockquote className="ar-acceptinv-message">{message}</blockquote> : null}

        {hasAccount ? (
          <p className="ar-acceptinv-note">
            Email ini sudah punya akun Ariadne. Terima undangan, lalu masuk dengan password Anda.
          </p>
        ) : (
          <>
            <FormField
              label="Nama"
              hint="Ditampilkan ke tim proyek, mis. di komentar."
              error={localError?.field === 'name' ? localError.text : fieldErrors?.displayName}
            >
              {(field) => (
                <TextInput
                  {...field}
                  size="lg"
                  name="displayName"
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
            </FormField>
            <FormField
              label="Password"
              hint={`Minimal ${MIN_PASSWORD_LENGTH} karakter. Kalimat panjang lebih kuat daripada simbol acak.`}
              error={localError?.field === 'password' ? localError.text : fieldErrors?.password}
            >
              {(field) => (
                <TextInput
                  {...field}
                  size="lg"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </FormField>
            <FormField label="Ulangi password">
              {(field) => (
                <TextInput
                  {...field}
                  size="lg"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              )}
            </FormField>
          </>
        )}

        {error ? (
          <p className="ar-authform-alert" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          variant="primary"
          type="submit"
          className="ar-authform-submit"
          disabled={submitting}
        >
          {submitting ? 'Menyimpan…' : hasAccount ? 'Terima undangan' : 'Buat akun dan masuk'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
