import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { InviteDialog } from '@/components/organisms/InviteDialog'
import { ProjectMembersTable } from '@/components/organisms/ProjectMembersTable'
import type { InvitationItem, ProjectMemberItem } from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const MEMBERS: ProjectMemberItem[] = [
  {
    userId: 'a',
    displayName: 'Ahmad',
    email: 'ahmad@perusahaan.co.id',
    role: 'Pengelola',
    isGuest: false,
    status: 'Aktif',
    addedAt: '2026-06-02T02:00:00Z',
  },
  {
    userId: 'b',
    displayName: 'Pak Budi',
    email: 'budi@klien.example',
    role: 'Tamu',
    isGuest: true,
    status: 'Aktif',
    addedAt: '2026-08-03T02:00:00Z',
  },
]

const INVITES: InvitationItem[] = [
  {
    id: 's',
    email: 'sari@klien.example',
    role: 'Tamu',
    invitedBy: 'Ahmad',
    createdAt: '2026-09-26T02:00:00Z',
    expiresAt: '2026-10-03T02:00:00Z',
    expired: false,
  },
]

function InviteDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button icon="mail" onClick={() => setOpen(true)}>
        Buka Undang ke Sentul
      </Button>
      <InviteDialog
        open={open}
        onClose={() => setOpen(false)}
        projectName="Sentul"
        onSubmit={() => setOpen(false)}
      />
    </>
  )
}

/** Organisme Fase 8: dialog Undang dan tabel anggota dengan undangan yang menunggu. */
export function Phase8Organisms() {
  return (
    <>
      <Demo name="InviteDialog" note={EXTRA}>
        <InviteDemo />
      </Demo>
      <Demo name="ProjectMembersTable dengan undangan" note={EXTRA} column>
        <ProjectMembersTable
          projectName="Sentul"
          members={MEMBERS}
          invitations={INVITES}
          canManage
          onChangeRole={noop}
          onRemove={noop}
        />
      </Demo>
    </>
  )
}
