import { useState, type FormEvent, type MouseEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { TextInput } from '@/components/atoms/TextInput'
import { AuthFormShell } from '@/components/molecules/AuthFormShell'
import { FormField } from '@/components/molecules/FormField'

export interface LoginFormProps {
  onSubmit: (input: { email: string; password: string; rememberMe: boolean }) => void
  submitting?: boolean
  /** Pesan gagal dari server; sengaja sama untuk semua sebab (pedoman B9). */
  error?: string
  forgotHref: string
  onNavigate: (href: string) => void
}

/** Form masuk (mockup 01): email + password, "Ingat saya", dan tautan "Lupa password?". */
export function LoginForm({ onSubmit, submitting, error, forgotHref, onNavigate }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit({ email: email.trim(), password, rememberMe })
  }

  function goForgot(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    onNavigate(forgotHref)
  }

  return (
    <AuthFormShell
      title="Masuk"
      subtitle="Gunakan email kantor Anda."
      footnote="Tamu dari klien masuk lewat tautan undangan di email."
    >
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
        <FormField
          label="Password"
          labelAside={
            <a href={forgotHref} onClick={goForgot}>
              Lupa password?
            </a>
          }
        >
          {(field) => (
            <TextInput
              {...field}
              size="lg"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </FormField>
        <Checkbox
          label="Ingat saya di perangkat ini"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
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
          {submitting ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>
    </AuthFormShell>
  )
}
