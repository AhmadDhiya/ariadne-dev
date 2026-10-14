import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useLogin, useMe } from '@/api/auth'
import { messageOf } from '@/api/errors'
import { AuthLayout } from '@/components/templates/AuthLayout'
import { LoginForm } from '@/components/organisms/LoginForm'
import { safeNextPath } from '@/lib/safeRedirect'

/** Halaman masuk. Setelah berhasil, kembali ke halaman yang tadi dituju (hanya jalur di aplikasi ini, pedoman B12). */
export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const me = useMe()
  const login = useLogin()

  // Sudah masuk: tidak perlu melihat form lagi
  if (me.data) return <Navigate to={next} replace />

  return (
    <AuthLayout>
      <LoginForm
        submitting={login.isPending}
        error={login.isError ? messageOf(login.error) : undefined}
        forgotHref="/lupa-password"
        onNavigate={(href) => void navigate(href)}
        onSubmit={(input) =>
          login.mutate(input, { onSuccess: () => void navigate(next, { replace: true }) })
        }
      />
    </AuthLayout>
  )
}
