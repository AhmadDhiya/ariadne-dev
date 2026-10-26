import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import { useCreateSubProject, useProject, useProjectMembers, useProjectTree } from '@/api/projects'
import { useCreateTask, useLabels, useTasks } from '@/api/tasks'
import { useAppContext, type ProjectContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import { Breadcrumb } from '@/components/molecules/Breadcrumb'
import { EmptyState } from '@/components/molecules/EmptyState'
import { ProjectProgress } from '@/components/molecules/ProjectProgress'
import { Tabs } from '@/components/molecules/Tabs'
import { FormDialog } from '@/components/organisms/FormDialog'
import { TaskFormDialog } from '@/components/organisms/TaskFormDialog'
import { ProjectLayout } from '@/components/templates/ProjectLayout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { MAX_PROJECT_DEPTH } from '@/lib/projectRules'
import {
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  type TaskFilters,
} from '@/lib/taskFilters'
import { toTaskPayload } from '@/lib/taskForm'
import { projectOptions } from '@/lib/taskGroups'
import { NotFoundPage } from '@/pages/NotFoundPage'

const TABS = [
  { label: 'Tabel', segment: 'tabel' },
  { label: 'Gantt', segment: 'gantt' },
  { label: 'Milestone', segment: 'milestone' },
  { label: 'Anggota', segment: 'anggota' },
]

/**
 * Halaman proyek: judul, progres, breadcrumb, tombol, dan tabs; isi tab ditampilkan lewat <Outlet>.
 * Proyek yang tidak ada dan proyek yang tidak boleh dilihat memberi tampilan yang sama (404).
 */
export function ProjectPage() {
  const { me } = useAppContext()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const project = useProject(projectId)
  const createSub = useCreateSubProject(projectId ?? '')
  const createTask = useCreateTask()
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  useDocumentTitle(project.data?.name ?? 'Proyek')

  const activeSegment = location.pathname.split('/')[3] ?? 'tabel'
  // Filter hanya berlaku di tab Tabel; tab lain memuat task apa adanya (untuk progres di header)
  const filters = useMemo(
    () => (activeSegment === 'tabel' ? filtersFromParams(params) : EMPTY_FILTERS),
    [activeSegment, params],
  )
  const tasks = useTasks(projectId, filters)
  const tree = useProjectTree()
  const members = useProjectMembers(projectId)
  const labels = useLabels(projectId)

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
  const active = TABS.find((t) => t.segment === activeSegment) ?? TABS[0]
  const onFiltersChange = (next: TaskFilters) => setParams(filtersToParams(next), { replace: true })
  const canEditTasks = tasks.data?.canEdit ?? false
  const people = (members.data ?? [])
    .filter((m) => m.role !== 'Tamu')
    .map((m) => ({ id: m.userId, name: m.displayName }))

  const context: ProjectContext = {
    me,
    project: data,
    tasks,
    filters,
    onFiltersChange,
    onCreateTask: () => setTaskDialogOpen(true),
  }

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

  const progress = tasks.data?.progress

  return (
    <ProjectLayout
      breadcrumb={breadcrumb}
      title={data.name}
      meta={
        <>
          {progress ? (
            <ProjectProgress
              projectName={data.name}
              done={progress.done}
              total={progress.total}
              percent={progress.percent}
            />
          ) : null}
          {data.memberNames.length > 0 ? (
            <AvatarStack names={data.memberNames} max={5} size={24} />
          ) : null}
        </>
      }
      actions={
        <>
          {data.canManage && data.depth < MAX_PROJECT_DEPTH ? (
            <Button icon="plus" onClick={() => setSubDialogOpen(true)}>
              Tambah sub-proyek
            </Button>
          ) : null}
          {canEditTasks ? (
            <Button variant="primary" icon="plus" onClick={() => setTaskDialogOpen(true)}>
              Tambah task
            </Button>
          ) : null}
        </>
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

      <TaskFormDialog
        open={taskDialogOpen}
        onClose={() => {
          setTaskDialogOpen(false)
          createTask.reset()
        }}
        title="Tambah task"
        description={`Di ${data.name}. Nomor task dibuat otomatis.`}
        submitLabel="Tambah task"
        initial={{ projectId: data.id }}
        projects={projectOptions(tree.data ?? [], data.id)}
        people={people}
        knownLabels={(labels.data ?? []).map((l) => l.name)}
        submitting={createTask.isPending}
        fieldErrors={createTask.isError ? fieldErrorsOf(createTask.error) : undefined}
        formError={
          createTask.isError && Object.keys(fieldErrorsOf(createTask.error)).length === 0
            ? messageOf(createTask.error)
            : undefined
        }
        onSubmit={(values) =>
          createTask.mutate(
            { projectId: values.projectId, ...toTaskPayload(values) },
            {
              onSuccess: (created) => {
                setTaskDialogOpen(false)
                toast.success(`Task ${created.key} ditambahkan`)
              },
            },
          )
        }
      />

      <FormDialog
        open={subDialogOpen}
        onClose={() => {
          setSubDialogOpen(false)
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
              setSubDialogOpen(false)
              toast.success(`Sub-proyek ${created.name} ditambahkan`)
              void navigate(`/proyek/${created.id}/${active?.segment ?? 'tabel'}`)
            },
          })
        }
      />
    </ProjectLayout>
  )
}
