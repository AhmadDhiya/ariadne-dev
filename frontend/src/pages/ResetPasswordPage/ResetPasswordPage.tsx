import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useResetPassword } from '@/api/auth'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { EmptyState } from '@/components/molecules/EmptyState'
import { ResetPasswordForm } from '@/components/organisms/ResetPasswordForm'
import { AuthLayout } from '@/components/templates/AuthLayout'

interface ResetLink {
  email: string
  token: string
}

/**
 * Email dan token ada di bagian "#" tautan (tidak ikut terkirim ke server atau tercatat di log akses).
 * Begitu dibaca, bagian itu dihapus dari bilah alamat dan riwayat browser (pedoman H4).
 */
function readLink(): ResetLink | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const email = params.get('email')
  const token = params.get('token')
  return email && token ? { email, token } : null
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [link] = useState(readLink)
  const reset = useResetPassword()

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  if (!link) {
    return (
      <AuthLayout>
        <EmptyState
          title="Tautan tidak lengkap"
          description="Buka tautan dari email Anda, atau minta tautan baru lewat “Lupa password?”."
          action={<a href="/lupa-password">Minta tautan baru</a>}
        />
      </AuthLayout>
    )
  }

  const fieldErrors = reset.isError ? fieldErrorsOf(reset.error) : {}
  return (
    <AuthLayout>
      <ResetPasswordForm
        email={link.email}
        submitting={reset.isPending}
        done={reset.isSuccess}
        passwordError={fieldErrors.newPassword}
        error={reset.isError && !fieldErrors.newPassword ? messageOf(reset.error) : undefined}
        loginHref="/masuk"
        onNavigate={(href) => void navigate(href)}
        onSubmit={(newPassword) => reset.mutate({ ...link, newPassword })}
      />
    </AuthLayout>
  )
}
