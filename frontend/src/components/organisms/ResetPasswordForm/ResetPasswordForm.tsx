import { useState, type FormEvent, type MouseEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextInput } from '@/components/atoms/TextInput'
import { AuthFormShell } from '@/components/molecules/AuthFormShell'
import { FormField } from '@/components/molecules/FormField'

export const MIN_PASSWORD_LENGTH = 12

export interface ResetPasswordFormProps {
  /** Email dari tautan (hanya ditampilkan, tidak bisa diubah). */
  email: string
  onSubmit: (newPassword: string) => void
  submitting?: boolean
  /** Kesalahan dari server pada kolom password (mis. terlalu pendek). */
  passwordError?: string
  /** Kesalahan umum (mis. tautan kedaluwarsa). */
  error?: string
  /** Password sudah diubah: tampilkan tautan ke halaman masuk. */
  done?: boolean
  loginHref: string
  onNavigate: (href: string) => void
}

/** Form memilih password baru (dari tautan email reset atau tautan selamat datang). */
export function ResetPasswordForm({
  email,
  onSubmit,
  submitting,
  passwordError,
  error,
  done,
  loginHref,
  onNavigate,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState<string>()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`)
    } else if (password !== confirm) {
      setLocalError('Konfirmasi password tidak sama.')
    } else {
      setLocalError(undefined)
      onSubmit(password)
    }
  }

  function goLogin(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    onNavigate(loginHref)
  }

  if (done) {
    return (
      <AuthFormShell
        title="Password diubah"
        subtitle="Sekarang Anda bisa masuk dengan password baru."
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
      title="Pilih password baru"
      subtitle={
        <>
          Untuk akun <b>{email}</b>.
        </>
      }
      footnote={
        <a href={loginHref} onClick={goLogin}>
          Kembali ke halaman masuk
        </a>
      }
    >
      <form className="ar-authform" onSubmit={submit}>
        <FormField
          label="Password baru"
          hint={`Minimal ${MIN_PASSWORD_LENGTH} karakter. Kalimat panjang lebih kuat daripada simbol acak.`}
          error={localError ?? passwordError}
        >
          {(field) => (
            <TextInput
              {...field}
              size="lg"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </FormField>
        <FormField label="Ulangi password baru">
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
          {submitting ? 'Menyimpan…' : 'Simpan password'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
