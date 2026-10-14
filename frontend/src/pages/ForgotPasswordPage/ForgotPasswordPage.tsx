import { useNavigate } from 'react-router'
import { useForgotPassword } from '@/api/auth'
import { messageOf } from '@/api/errors'
import { ForgotPasswordForm } from '@/components/organisms/ForgotPasswordForm'
import { AuthLayout } from '@/components/templates/AuthLayout'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const forgot = useForgotPassword()

  return (
    <AuthLayout>
      <ForgotPasswordForm
        submitting={forgot.isPending}
        sentMessage={forgot.data?.message}
        error={forgot.isError ? messageOf(forgot.error) : undefined}
        loginHref="/masuk"
        onNavigate={(href) => void navigate(href)}
        onSubmit={(email) => forgot.mutate(email)}
      />
    </AuthLayout>
  )
}
