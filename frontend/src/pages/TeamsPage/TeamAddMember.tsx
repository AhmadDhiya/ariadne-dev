import { useState } from 'react'
import { messageOf } from '@/api/errors'
import { useAddTeamMember } from '@/api/teams'
import { useUserLookup } from '@/api/users'
import { AddMemberBar, type Candidate } from '@/components/organisms/AddMemberBar'
import { useToast } from '@/hooks/useToast'
import type { TeamRole } from '@/types/api'

const ROLES: { value: TeamRole; label: string }[] = [
  { value: 'Anggota', label: 'Anggota' },
  { value: 'Supervisor', label: 'Supervisor' },
]

/**
 * Baris "Tambah anggota" milik satu tim. Dipasang dengan `key={teamId}` supaya isiannya otomatis
 * kosong setiap pindah tim (tanpa efek yang mengatur state).
 */
export function TeamAddMember({ teamId, teamName }: { teamId: string; teamName: string }) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Candidate | null>(null)
  const [role, setRole] = useState<TeamRole>('Anggota')
  const [error, setError] = useState<string>()

  const lookup = useUserLookup(query, { teamId }, !picked)
  const add = useAddTeamMember(teamId)

  function submit() {
    if (!picked) return
    setError(undefined)
    add.mutate(
      { userId: picked.id, role },
      {
        onSuccess: () => {
          toast.success(`${picked.name} ditambahkan ke ${teamName}`)
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
      roleLabel="Peran di tim"
      onSubmit={submit}
      submitting={add.isPending}
      error={error}
    />
  )
}
