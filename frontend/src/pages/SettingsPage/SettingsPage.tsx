import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { fieldErrorsOf, messageOf } from '@/api/errors'
import {
  useArchiveProject,
  useCreateProject,
  useProjectTree,
  useRenameProject,
} from '@/api/projects'
import { useCreateUser, useUpdateUser, useUsers } from '@/api/users'
import { useAppContext } from '@/app/context'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/molecules/EmptyState'
import { PageHeader } from '@/components/molecules/PageHeader'
import { Tabs } from '@/components/molecules/Tabs'
import { FormDialog } from '@/components/organisms/FormDialog'
import { ProjectsTable } from '@/components/organisms/ProjectsTable'
import { UsersTable } from '@/components/organisms/UsersTable'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { flattenTree } from '@/lib/projectTree'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { ProjectNode, UserSummary } from '@/types/api'

const TABS = ['Pengguna', 'Proyek']

/** Pengaturan (khusus Admin): kelola pengguna dan proyek. Tanpa mockup; dibuat dari komponen yang sama dengan halaman Tim. */
export function SettingsPage() {
  const { me } = useAppContext()
  useDocumentTitle('Pengaturan')
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'proyek' ? 'Proyek' : 'Pengguna'

  const users = useUsers(me.isAdmin)
  const tree = useProjectTree()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const createProject = useCreateProject()
  const renameProject = useRenameProject()
  const archiveProject = useArchiveProject()

  const [dialog, setDialog] = useState<'user' | 'project' | null>(null)
  const [deactivating, setDeactivating] = useState<UserSummary | null>(null)
  const [renaming, setRenaming] = useState<ProjectNode | null>(null)
  const [archiving, setArchiving] = useState<ProjectNode | null>(null)

  const projectRows = useMemo(() => flattenTree(tree.data ?? []), [tree.data])

  if (!me.isAdmin) return <NotFoundPage />

  const closeDialog = () => {
    setDialog(null)
    createUser.reset()
    createProject.reset()
  }

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Kelola pengguna dan proyek aplikasi."
        actions={
          tab === 'Pengguna' ? (
            <Button variant="primary" icon="plus" onClick={() => setDialog('user')}>
              Tambah pengguna
            </Button>
          ) : (
            <Button variant="primary" icon="plus" onClick={() => setDialog('project')}>
              Buat proyek
            </Button>
          )
        }
      />
      <Tabs
        label="Bagian pengaturan"
        items={TABS}
        active={tab}
        onSelect={(label) =>
          setParams(label === 'Proyek' ? { tab: 'proyek' } : {}, { replace: true })
        }
      />

      {tab === 'Pengguna' ? (
        users.isPending ? (
          <p role="status">Memuat pengguna…</p>
        ) : users.isError ? (
          <EmptyState
            title="Daftar pengguna tidak bisa dimuat"
            description={messageOf(users.error)}
            action={<Button onClick={() => void users.refetch()}>Coba lagi</Button>}
          />
        ) : (
          <UsersTable
            users={users.data}
            currentUserId={me.id}
            busyUserId={updateUser.isPending ? updateUser.variables.id : null}
            onToggleAdmin={(user) =>
              updateUser.mutate(
                { id: user.id, isAdmin: !user.isAdmin },
                {
                  onSuccess: () =>
                    toast.success(
                      user.isAdmin
                        ? `${user.displayName} bukan admin lagi`
                        : `${user.displayName} sekarang admin`,
                    ),
                  onError: (error) => toast.error(messageOf(error)),
                },
              )
            }
            onToggleActive={(user) => {
              if (user.isActive) setDeactivating(user)
              else
                updateUser.mutate(
                  { id: user.id, isActive: true },
                  {
                    onSuccess: () => toast.success(`${user.displayName} diaktifkan kembali`),
                    onError: (error) => toast.error(messageOf(error)),
                  },
                )
            }}
          />
        )
      ) : tree.isPending ? (
        <p role="status">Memuat proyek…</p>
      ) : (
        <ProjectsTable
          projects={projectRows}
          onOpen={(p) => void navigate(`/proyek/${p.id}/anggota`)}
          onRename={setRenaming}
          onArchive={setArchiving}
        />
      )}

      <FormDialog
        open={dialog === 'user'}
        onClose={closeDialog}
        title="Tambah pengguna"
        description="Orang ini menerima email berisi tautan untuk memilih passwordnya sendiri. Admin tidak pernah mengetahui password siapa pun."
        fields={[
          {
            name: 'email',
            label: 'Email',
            kind: 'email',
            maxLength: 254,
            placeholder: 'nama@perusahaan.co.id',
            autoComplete: 'off',
          },
          { name: 'displayName', label: 'Nama', maxLength: 100, placeholder: 'mis. Wiwiet' },
          { name: 'isAdmin', label: 'Jadikan admin aplikasi', kind: 'checkbox' },
        ]}
        submitLabel="Tambah pengguna"
        submitting={createUser.isPending}
        fieldErrors={createUser.isError ? fieldErrorsOf(createUser.error) : undefined}
        formError={
          createUser.isError && Object.keys(fieldErrorsOf(createUser.error)).length === 0
            ? messageOf(createUser.error)
            : undefined
        }
        onSubmit={(values) =>
          createUser.mutate(
            {
              email: String(values.email).trim(),
              displayName: String(values.displayName).trim(),
              isAdmin: Boolean(values.isAdmin),
            },
            {
              onSuccess: (created) => {
                closeDialog()
                toast.success(`Tautan untuk memilih password dikirim ke ${created.email}`)
              },
            },
          )
        }
      />
      <FormDialog
        open={dialog === 'project'}
        onClose={closeDialog}
        title="Buat proyek"
        description="Kode dipakai sebagai awalan ID task (mis. SEN-142) dan tidak bisa diubah nanti."
        fields={[
          {
            name: 'name',
            label: 'Nama proyek',
            maxLength: 100,
            placeholder: 'mis. Peluncuran Aplikasi',
          },
          {
            name: 'code',
            label: 'Kode',
            maxLength: 6,
            placeholder: 'mis. SEN',
            hint: '2–6 karakter: huruf dan angka, diawali huruf.',
          },
        ]}
        submitLabel="Buat proyek"
        submitting={createProject.isPending}
        fieldErrors={createProject.isError ? fieldErrorsOf(createProject.error) : undefined}
        formError={
          createProject.isError && Object.keys(fieldErrorsOf(createProject.error)).length === 0
            ? messageOf(createProject.error)
            : undefined
        }
        onSubmit={(values) =>
          createProject.mutate(
            { name: String(values.name).trim(), code: String(values.code).trim() },
            {
              onSuccess: (created) => {
                closeDialog()
                toast.success(`Proyek ${created.name} dibuat`)
                void navigate(`/proyek/${created.id}/anggota`)
              },
            },
          )
        }
      />
      <FormDialog
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title={`Nonaktifkan ${deactivating?.displayName ?? ''}?`}
        description="Orang ini tidak bisa masuk lagi dan semua sesinya langsung berakhir. Datanya tetap ada dan akun bisa diaktifkan kembali."
        fields={[]}
        submitLabel="Nonaktifkan"
        submitting={updateUser.isPending}
        formError={updateUser.isError ? messageOf(updateUser.error) : undefined}
        onSubmit={() => {
          if (!deactivating) return
          updateUser.mutate(
            { id: deactivating.id, isActive: false },
            {
              onSuccess: () => {
                toast.success(`${deactivating.displayName} dinonaktifkan`)
                setDeactivating(null)
              },
            },
          )
        }}
      />
      <FormDialog
        open={renaming !== null}
        onClose={() => {
          setRenaming(null)
          renameProject.reset()
        }}
        title={`Ubah nama ${renaming?.name ?? ''}`}
        description="Kode proyek tidak berubah."
        fields={[{ name: 'name', label: 'Nama proyek', maxLength: 100 }]}
        initialValues={{ name: renaming?.name ?? '' }}
        submitLabel="Simpan"
        submitting={renameProject.isPending}
        fieldErrors={renameProject.isError ? fieldErrorsOf(renameProject.error) : undefined}
        formError={
          renameProject.isError && Object.keys(fieldErrorsOf(renameProject.error)).length === 0
            ? messageOf(renameProject.error)
            : undefined
        }
        onSubmit={(values) => {
          if (!renaming) return
          const name = String(values.name).trim()
          renameProject.mutate(
            { id: renaming.id, name },
            {
              onSuccess: () => {
                toast.success(`Proyek diubah menjadi ${name}`)
                setRenaming(null)
              },
            },
          )
        }}
      />
      <FormDialog
        open={archiving !== null}
        onClose={() => {
          setArchiving(null)
          archiveProject.reset()
        }}
        title={`Arsipkan ${archiving?.name ?? ''}?`}
        description="Proyek ini beserta semua sub-proyeknya hilang dari daftar dan tidak bisa dipilih lagi. Datanya tidak dihapus, tetapi belum ada tombol untuk memulihkannya; hubungi pengembang bila perlu dikembalikan."
        fields={[]}
        submitLabel="Arsipkan"
        submitting={archiveProject.isPending}
        formError={archiveProject.isError ? messageOf(archiveProject.error) : undefined}
        onSubmit={() => {
          if (!archiving) return
          archiveProject.mutate(archiving.id, {
            onSuccess: () => {
              toast.success(`${archiving.name} diarsipkan`)
              setArchiving(null)
            },
          })
        }}
      />
    </>
  )
}
