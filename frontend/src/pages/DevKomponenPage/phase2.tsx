import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { AuthFormShell } from '@/components/molecules/AuthFormShell'
import { DataTable } from '@/components/molecules/DataTable'
import { LabyrinthArt } from '@/components/molecules/LabyrinthArt'
import { PageHeader } from '@/components/molecules/PageHeader'
import { PersonCell } from '@/components/molecules/PersonCell'
import { AddMemberBar, type Candidate } from '@/components/organisms/AddMemberBar'
import { ForgotPasswordForm } from '@/components/organisms/ForgotPasswordForm'
import { FormDialog } from '@/components/organisms/FormDialog'
import { LoginForm } from '@/components/organisms/LoginForm'
import { ProjectsTable } from '@/components/organisms/ProjectsTable'
import { ProjectMembersTable } from '@/components/organisms/ProjectMembersTable'
import { ResetPasswordForm } from '@/components/organisms/ResetPasswordForm'
import { Sidebar } from '@/components/organisms/Sidebar'
import { TeamList } from '@/components/organisms/TeamList'
import { TeamMembersPanel } from '@/components/organisms/TeamMembersPanel'
import { Topbar } from '@/components/organisms/Topbar'
import { UsersTable } from '@/components/organisms/UsersTable'
import type {
  ProjectMemberItem,
  ProjectNode,
  TeamDetail,
  TeamSummary,
  UserSummary,
} from '@/types/api'
import { Demo } from './Demo'

const EXTRA = 'tambahan, tidak ada di design system'
const noop = () => undefined

const PROJECTS: ProjectNode[] = [
  { id: 'sen', parentId: null, rootId: 'sen', depth: 0, name: 'Sentul', code: 'SEN', sortOrder: 1 },
  {
    id: 'dis',
    parentId: 'sen',
    rootId: 'sen',
    depth: 1,
    name: 'Dispatch',
    code: null,
    sortOrder: 1,
  },
  { id: 'slm', parentId: 'sen', rootId: 'sen', depth: 1, name: 'SLMS', code: null, sortOrder: 2 },
  {
    id: 'tem',
    parentId: 'slm',
    rootId: 'sen',
    depth: 2,
    name: 'Temuan UAT & API',
    code: null,
    sortOrder: 1,
  },
  {
    id: 'mdc',
    parentId: null,
    rootId: 'mdc',
    depth: 0,
    name: 'Migrasi Data Center',
    code: 'MDC',
    sortOrder: 2,
  },
]

const TEAMS: TeamSummary[] = [
  {
    id: 't1',
    name: 'Tim Sentul',
    memberCount: 7,
    supervisors: ['Ahmad'],
    memberNames: ['Ahmad', 'Wiwiet', 'Manto', 'Rama', 'Galih', 'Khalil', 'Bintang'],
  },
  {
    id: 't2',
    name: 'Tim Infrastruktur',
    memberCount: 4,
    supervisors: ['Syaikhan'],
    memberNames: ['Syaikhan', 'Wiwiet', 'Manto', 'Galih'],
  },
]

const TEAM_DETAIL: TeamDetail = {
  id: 't1',
  name: 'Tim Sentul',
  canManage: true,
  supervisors: ['Ahmad'],
  projects: ['Sentul', 'Migrasi Data Center'],
  members: [
    {
      userId: '1',
      displayName: 'Ahmad',
      email: 'ahmad@perusahaan.co.id',
      role: 'Supervisor',
      otherTeams: ['Tim QA'],
    },
    {
      userId: '2',
      displayName: 'Wiwiet',
      email: 'wiwiet@perusahaan.co.id',
      role: 'Anggota',
      otherTeams: ['Tim Infrastruktur'],
    },
    {
      userId: '3',
      displayName: 'Rama',
      email: 'rama@perusahaan.co.id',
      role: 'Anggota',
      otherTeams: ['Tim QA'],
    },
  ],
}

const PROJECT_MEMBERS: ProjectMemberItem[] = [
  {
    userId: '1',
    displayName: 'Ahmad',
    email: 'ahmad@perusahaan.co.id',
    role: 'Pengelola',
    isGuest: false,
    status: 'Aktif',
    addedAt: '2026-06-02T02:00:00Z',
  },
  {
    userId: '2',
    displayName: 'Wiwiet',
    email: 'wiwiet@perusahaan.co.id',
    role: 'Anggota',
    isGuest: false,
    status: 'Aktif',
    addedAt: '2026-06-02T02:01:00Z',
  },
  {
    userId: '3',
    displayName: 'Pak Budi',
    email: 'budi@klien.example',
    role: 'Tamu',
    isGuest: true,
    status: 'Aktif',
    addedAt: '2026-08-03T02:02:00Z',
  },
]

const USERS: UserSummary[] = [
  {
    id: '1',
    email: 'ahmad@perusahaan.co.id',
    displayName: 'Ahmad',
    isAdmin: true,
    isActive: true,
    isGuest: false,
    createdAt: '2026-06-01T00:00:00Z',
    teams: ['Tim Sentul', 'Tim QA'],
  },
  {
    id: '2',
    email: 'wiwiet@perusahaan.co.id',
    displayName: 'Wiwiet',
    isAdmin: false,
    isActive: true,
    isGuest: false,
    createdAt: '2026-06-01T00:00:00Z',
    teams: ['Tim Sentul'],
  },
  {
    id: '3',
    email: 'budi@klien.example',
    displayName: 'Pak Budi',
    isAdmin: false,
    isActive: true,
    isGuest: true,
    createdAt: '2026-06-01T00:00:00Z',
    teams: [],
  },
]

const PEOPLE: Candidate[] = [
  { id: 'k', name: 'Khalil', hint: 'Anggota · Tim Sentul' },
  { id: 'b', name: 'Bintang', hint: 'Anggota · Tim QA' },
]

function AddMemberDemo() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [role, setRole] = useState<'Anggota' | 'Supervisor'>('Anggota')
  const found = PEOPLE.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <AddMemberBar
      label="Tambah anggota"
      query={query}
      onQueryChange={setQuery}
      candidates={found}
      selected={selected}
      onSelect={setSelected}
      roles={[
        { value: 'Anggota', label: 'Anggota' },
        { value: 'Supervisor', label: 'Supervisor' },
      ]}
      role={role}
      onRoleChange={setRole}
      roleLabel="Peran"
      onSubmit={() => {
        setSelected(null)
        setQuery('')
      }}
    />
  )
}

function FormDialogDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Buka dialog Tambah pengguna</Button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah pengguna"
        description="Mereka menerima email untuk memilih password sendiri."
        fields={[
          { name: 'email', label: 'Email', kind: 'email', placeholder: 'nama@perusahaan.co.id' },
          { name: 'displayName', label: 'Nama', placeholder: 'mis. Wiwiet' },
        ]}
        submitLabel="Tambah pengguna"
        onSubmit={() => setOpen(false)}
      />
    </>
  )
}

/** Molekul tambahan Fase 2. */
export function Phase2Molecules() {
  return (
    <>
      <Demo name="PersonCell" note={EXTRA} column surface>
        <PersonCell name="Ahmad" email="ahmad@perusahaan.co.id" />
        <PersonCell name="Pak Budi" guest />
      </Demo>
      <Demo name="PageHeader" note={EXTRA} column>
        <PageHeader
          title="Tim"
          description="Kelola anggota dan supervisor tiap tim."
          actions={
            <Button variant="primary" icon="plus">
              Buat tim
            </Button>
          }
        />
      </Demo>
      <Demo name="DataTable" note={EXTRA} column surface>
        <DataTable
          caption="Contoh tabel"
          columns={[
            { key: 'n', header: 'Nama', render: (r: { n: string; p: string }) => r.n },
            { key: 'p', header: 'Peran', width: 140, render: (r) => r.p },
          ]}
          rows={[
            { n: 'Ahmad', p: 'Supervisor' },
            { n: 'Rama', p: 'Anggota' },
          ]}
          rowKey={(r) => r.n}
        />
      </Demo>
      <Demo name="AuthFormShell + LabyrinthArt" note={EXTRA} column>
        <AuthFormShell
          title="Masuk"
          subtitle="Benang merah setiap proyek."
          footnote="Akun dibuat oleh admin."
        >
          <p className="ar-muted">Isi form ditempatkan di sini.</p>
        </AuthFormShell>
        {/* Gambar labirin mengisi induknya secara absolut; bingkai ini membatasinya agar tidak menutupi halaman */}
        <div style={{ position: 'relative', height: 220, overflow: 'hidden', borderRadius: 12 }}>
          <LabyrinthArt />
        </div>
      </Demo>
    </>
  )
}

/** Organisme dan formulir Fase 2. */
export function Phase2Organisms() {
  return (
    <>
      <Demo name="Sidebar" note={EXTRA} scroll>
        <div style={{ height: 460 }}>
          <Sidebar
            projects={PROJECTS}
            activeKey={null}
            activeProjectId="slm"
            showTimeline
            showTeams
            showSettings
            onNavigate={noop}
          />
        </div>
      </Demo>
      <Demo name="Topbar" note={EXTRA} column>
        <Topbar
          userName="Ahmad"
          subtitle="Supervisor · Tim Sentul"
          theme="light"
          onThemeChange={noop}
          onLogout={noop}
        />
      </Demo>
      <Demo name="TeamList" note={EXTRA} column>
        <TeamList teams={TEAMS} selectedId="t1" onNavigate={noop} />
      </Demo>
      <Demo
        name="AddMemberBar"
        note={`${EXTRA}; ketik "k" lalu panah bawah + Enter`}
        column
        surface
      >
        <AddMemberDemo />
      </Demo>
      <Demo name="TeamMembersPanel" note={EXTRA} column>
        <TeamMembersPanel team={TEAM_DETAIL} onRename={noop} onChangeRole={noop} onRemove={noop} />
      </Demo>
      <Demo name="ProjectMembersTable" note={EXTRA} column>
        <ProjectMembersTable
          projectName="Sentul"
          members={PROJECT_MEMBERS}
          canManage
          onChangeRole={noop}
          onRemove={noop}
        />
      </Demo>
      <Demo name="ProjectsTable" note={EXTRA} column>
        <ProjectsTable projects={PROJECTS} onOpen={noop} onRename={noop} onArchive={noop} />
      </Demo>
      <Demo name="UsersTable" note={EXTRA} column>
        <UsersTable users={USERS} currentUserId="1" onToggleAdmin={noop} onToggleActive={noop} />
      </Demo>
      <Demo name="FormDialog" note={EXTRA}>
        <FormDialogDemo />
      </Demo>
      <Demo name="LoginForm" note={EXTRA} column>
        <LoginForm
          onSubmit={noop}
          forgotHref="#lupa"
          onNavigate={noop}
          error="Email atau password salah."
        />
      </Demo>
      <Demo name="ForgotPasswordForm" note={EXTRA} column>
        <ForgotPasswordForm onSubmit={noop} loginHref="#masuk" onNavigate={noop} />
      </Demo>
      <Demo name="ResetPasswordForm" note={EXTRA} column>
        <ResetPasswordForm
          email="ahmad@perusahaan.co.id"
          onSubmit={noop}
          loginHref="#masuk"
          onNavigate={noop}
        />
      </Demo>
    </>
  )
}
