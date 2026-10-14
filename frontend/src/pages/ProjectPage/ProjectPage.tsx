import { useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { useCreateSubProject, useProject } from '@/api/projects'
import { useAppContext, type ProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import { Breadcrumb } from '@/components/molecules/Breadcrumb'
import { EmptyState } from '@/components/molecules/EmptyState'
import { Tabs } from '@/components/molecules/Tabs'
import { FormDialog } from '@/components/organisms/FormDialog'
import { ProjectLayout } from '@/components/templates/ProjectLayout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { MAX_PROJECT_DEPTH } from '@/lib/projectRules'

const TABS = [
  { label: 'Tabel', segment: 'tabel' },
  { label: 'Gantt', segment: 'gantt' },
  { label: 'Milestone', segment: 'milestone' },
  { label: 'Anggota', segment: 'anggota' },
]

/**
 * Halaman proyek: judul, breadcrumb, tombol, dan tabs; isi tab ditampilkan lewat <Outlet>.
 * Proyek yang tidak ada dan proyek yang tidak boleh dilihat memberi tampilan yang sama (404).
 */
export function ProjectPage() {
  const { me } = useAppContext()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const project = useProject(projectId)
  const createSub = useCreateSubProject(projectId ?? '')
  const [dialogOpen, setDialogOpen] = useState(false)
  useDocumentTitle(project.data?.name ?? 'Proyek')

  if (project.isPending) return <p role="status">Memuat proyek…</p>
  if (project.isError) {
    if (project.error instanceof ApiError && project.error.status === 404) return <NotFoundPage />
    return (
      <EmptyState
        title="Proyek tidak bisa dimuat"
        description={messageOf(project.error)}
        action={<Button onClick={() => void project.refetch()}>Coba lagi</Button>}
      />
    )
  }

  const data = project.data
  const activeSegment = location.pathname.split('/')[3] ?? 'tabel'
  const active = TABS.find((t) => t.segment === activeSegment) ?? TABS[0]
  const context: ProjectContext = { me, project: data }

  const ancestors = data.path.slice(0, -1)
  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: 'Proyek' },
        ...ancestors.map((c) => ({
          label: c.name,
          href: `/proyek/${c.id}/${active?.segment ?? 'tabel'}`,
          onNavigate: (e: { preventDefault: () => void }) => {
            e.preventDefault()
            void navigate(`/proyek/${c.id}/${active?.segment ?? 'tabel'}`)
          },
        })),
        { label: data.name },
      ]}
    />
  )

  return (
    <ProjectLayout
      breadcrumb={breadcrumb}
      title={data.name}
      meta={
        data.memberNames.length > 0 ? (
          <AvatarStack names={data.memberNames} max={5} size={24} />
        ) : undefined
      }
      actions={
        data.canManage && data.depth < MAX_PROJECT_DEPTH ? (
          <Button icon="plus" onClick={() => setDialogOpen(true)}>
            Tambah sub-proyek
          </Button>
        ) : undefined
      }
      tabs={
        <Tabs
          label="Tampilan proyek"
          items={TABS.map((t) => t.label)}
          active={active?.label ?? 'Tabel'}
          onSelect={(label) => {
            const segment = TABS.find((t) => t.label === label)?.segment
            if (segment) void navigate(`/proyek/${data.id}/${segment}`)
          }}
        />
      }
    >
      <Outlet context={context} />

      <FormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          createSub.reset()
        }}
        title={`Tambah sub-proyek di ${data.name}`}
        description="Proyek bisa bertingkat sampai 3 level. Anggota dan perannya mengikuti proyek induk teratas."
        fields={[
          {
            name: 'name',
            label: 'Nama sub-proyek',
            maxLength: 100,
            placeholder: 'mis. Testing Oktober',
          },
        ]}
        submitLabel="Tambah sub-proyek"
        submitting={createSub.isPending}
        fieldErrors={createSub.isError ? fieldErrorsOf(createSub.error) : undefined}
        formError={
          createSub.isError && Object.keys(fieldErrorsOf(createSub.error)).length === 0
            ? messageOf(createSub.error)
            : undefined
        }
        onSubmit={(values) =>
          createSub.mutate(String(values.name).trim(), {
            onSuccess: (created) => {
              setDialogOpen(false)
              toast.success(`Sub-proyek ${created.name} ditambahkan`)
              void navigate(`/proyek/${created.id}/${active?.segment ?? 'tabel'}`)
            },
          })
        }
      />
    </ProjectLayout>
  )
}
