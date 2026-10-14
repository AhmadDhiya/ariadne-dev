import { useState } from 'react'
import { messageOf } from '@/api/errors'
import { useAddProjectMember } from '@/api/projects'
import { useUserLookup } from '@/api/users'
import { AddMemberBar, type Candidate } from '@/components/organisms/AddMemberBar'
import { useToast } from '@/hooks/useToast'
import type { ProjectRole } from '@/types/api'

const ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'Anggota', label: 'Anggota' },
  { value: 'Pengelola', label: 'Pengelola' },
  { value: 'Tamu', label: 'Tamu' },
]

/** Baris "Tambah anggota" milik satu proyek; dipasang dengan `key` proyek root supaya isiannya reset sendiri. */
export function ProjectAddMember({ projectId }: { projectId: string }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Candidate | null>(null)
  const [role, setRole] = useState<ProjectRole>('Anggota')
  const [error, setError] = useState<string>()

  const lookup = useUserLookup(query, { projectId }, !picked)
  const add = useAddProjectMember(projectId)

  function submit() {
    if (!picked) return
    setError(undefined)
    add.mutate(
      { userId: picked.id, role },
      {
        onSuccess: () => {
          toast.success(`${picked.name} ditambahkan sebagai ${role}`)
          setQuery('')
          setPicked(null)
        },
        onError: (e) => setError(messageOf(e)),
      },
    )
  }

  return (
    <AddMemberBar
      label="Tambah anggota"
      query={query}
      onQueryChange={setQuery}
      candidates={(lookup.data ?? []).map((u) => ({ id: u.id, name: u.displayName, hint: u.hint }))}
      selected={picked}
      onSelect={setPicked}
      roles={ROLES}
      role={role}
      onRoleChange={setRole}
      roleLabel="Peran di proyek"
      onSubmit={submit}
      submitting={add.isPending}
      error={error}
    />
  )
}
