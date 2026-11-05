import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { useAcceptInvitation, useInvitationPreview } from '@/api/invitations'
import { EmptyState } from '@/components/molecules/EmptyState'
import { AcceptInvitationForm } from '@/components/organisms/AcceptInvitationForm'
import { AuthLayout } from '@/components/templates/AuthLayout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/**
 * Token ada di bagian "#" tautan (tidak ikut terkirim ke server atau tercatat di log akses).
 * Begitu dibaca, bagian itu dihapus dari bilah alamat dan riwayat browser (pedoman H4).
 */
function readToken(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('token')
}

/** Halaman terima undangan (tanpa mockup; gaya halaman masuk). */
export function AcceptInvitationPage() {
  useDocumentTitle('Terima undangan')
  const navigate = useNavigate()
  const [token] = useState(readToken)
  const preview = useInvitationPreview(token)
  const accept = useAcceptInvitation()

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  if (!token || preview.isError) {
    return (
      <AuthLayout>
        <EmptyState
          title={token ? 'Undangan tidak bisa dipakai' : 'Tautan tidak lengkap'}
          description={
            token
              ? messageOf(preview.error)
              : 'Buka tautan dari email undangan Anda, atau minta undangan baru ke pengelola proyek.'
          }
          action={<a href="/masuk">Ke halaman masuk</a>}
        />
      </AuthLayout>
    )
  }

  if (preview.isPending) {
    return (
      <AuthLayout>
        <p role="status">Memeriksa undangan…</p>
      </AuthLayout>
    )
  }

  const data = preview.data
  const fieldErrors = accept.isError ? fieldErrorsOf(accept.error) : {}
  return (
    <AuthLayout>
      <AcceptInvitationForm
        email={data.email}
        projectName={data.projectName}
        invitedBy={data.invitedBy}
        role={data.role}
        message={data.message}
        hasAccount={data.hasAccount}
        submitting={accept.isPending}
        fieldErrors={fieldErrors}
        error={
          accept.isError && Object.keys(fieldErrors).length === 0
            ? messageOf(accept.error)
            : undefined
        }
        joined={accept.isSuccess && !accept.data.signedIn}
        loginHref="/masuk"
        onNavigate={(href) => void navigate(href)}
        onSubmit={(input) =>
          accept.mutate(
            { token, ...input },
            {
              onSuccess: (result) => {
                if (result.signedIn)
                  void navigate(`/proyek/${result.projectId}/tabel`, { replace: true })
              },
            },
          )
        }
      />
    </AuthLayout>
  )
}
