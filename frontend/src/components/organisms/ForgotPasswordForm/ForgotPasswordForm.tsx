import { useState, type FormEvent, type MouseEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { TextInput } from '@/components/atoms/TextInput'
import { AuthFormShell } from '@/components/molecules/AuthFormShell'
import { FormField } from '@/components/molecules/FormField'

export interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void
  submitting?: boolean
  /** Setelah terkirim, form diganti pesan konfirmasi (jawabannya sama, ada atau tidaknya akun). */
  sentMessage?: string
  error?: string
  loginHref: string
  onNavigate: (href: string) => void
}

/** Form "Lupa password": hanya email. Konfirmasi tidak membedakan email terdaftar atau tidak. */
export function ForgotPasswordForm({
  onSubmit,
  submitting,
  sentMessage,
  error,
  loginHref,
  onNavigate,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit(email.trim())
  }

  function goLogin(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    onNavigate(loginHref)
  }

  return (
    <AuthFormShell
      title="Lupa password"
      subtitle="Masukkan email Anda. Kami kirim tautan untuk memilih password baru."
      footnote={
        <a href={loginHref} onClick={goLogin}>
          Kembali ke halaman masuk
        </a>
      }
    >
      {sentMessage ? (
        <p className="ar-authform-note" role="status">
          {sentMessage}
        </p>
      ) : (
        <form className="ar-authform" onSubmit={submit}>
          <FormField label="Email">
            {(field) => (
              <TextInput
                {...field}
                size="lg"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="nama@perusahaan.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {submitting ? 'Mengirim…' : 'Kirim tautan'}
          </Button>
        </form>
      )}
    </AuthFormShell>
  )
}
