/**
 * Bentuk data dari API. Harus sama dengan DTO di backend (backend/src/Ariadne.Api/Features/<fitur>/*Dtos.cs).
 * Aturan bisnis (siapa boleh apa) TIDAK dihitung di sini: frontend hanya menampilkan flag dari server.
 * Berada di luar folder api/ supaya komponen dan lib/ boleh memakai tipenya tanpa memanggil API.
 */
export type TeamRole = 'Supervisor' | 'Anggota'
export type ProjectRole = 'Pengelola' | 'Anggota' | 'Tamu'
export type ThemeChoice = 'light' | 'dark'

export interface TeamRef {
  id: string
  name: string
  role: TeamRole
}

export interface Me {
  id: string
  email: string
  displayName: string
  isAdmin: boolean
  isSupervisor: boolean
  isGuestOnly: boolean
  theme: ThemeChoice | null
  teams: TeamRef[]
}

export interface UserSummary {
  id: string
  email: string
  displayName: string
  isAdmin: boolean
  isActive: boolean
  isGuest: boolean
  createdAt: string
  teams: string[]
}

export interface UserLookupItem {
  id: string
  displayName: string
  email: string
  hint: string | null
}

export interface TeamSummary {
  id: string
  name: string
  memberCount: number
  supervisors: string[]
  memberNames: string[]
}

export interface TeamMemberItem {
  userId: string
  displayName: string
  email: string
  role: TeamRole
  otherTeams: string[]
  activeTasks: number
}

export interface TeamDetail {
  id: string
  name: string
  canManage: boolean
  supervisors: string[]
  projects: string[]
  members: TeamMemberItem[]
}

export interface ProjectNode {
  id: string
  parentId: string | null
  rootId: string
  depth: number
  name: string
  code: string | null
  sortOrder: number
  /** Task belum selesai (tanpa sub-task) di proyek ini dan sub-proyeknya. */
  taskCount: number
}

export interface ProjectCrumb {
  id: string
  name: string
}

export interface ProjectMemberCounts {
  total: number
  pengelola: number
  anggota: number
  tamu: number
}

export interface ProjectDetail {
  id: string
  parentId: string | null
  rootId: string
  depth: number
  name: string
  code: string | null
  path: ProjectCrumb[]
  myRole: ProjectRole | null
  canManage: boolean
  memberCounts: ProjectMemberCounts
  memberNames: string[]
}

export interface ProjectMemberItem {
  userId: string
  displayName: string
  /** Kosong bila yang bertanya adalah Tamu. */
  email: string | null
  role: ProjectRole
  isGuest: boolean
  status: string
  addedAt: string
}

/** Nama status dan prioritas persis seperti yang dikirim dan diterima API. */
export type WorkStatusName =
  'NotStarted' | 'OnProgress' | 'Fixing' | 'Blocked' | 'OnHold' | 'OnRequest' | 'Done' | 'Rutin'
export type PriorityName = 'Critical' | 'High' | 'Medium' | 'Low'

export interface TaskPerson {
  id: string
  name: string
}

export interface TaskRow {
  id: string
  /** ID tampilan, mis. "SEN-115". */
  key: string
  number: number
  projectId: string
  parentTaskId: string | null
  title: string
  status: WorkStatusName
  priority: PriorityName
  assignees: TaskPerson[]
  /** "YYYY-MM-DD" */
  startDate: string | null
  dueDate: string | null
  /** Hari kerja Senin–Jumat, dihitung server. */
  durationDays: number | null
  isOverdue: boolean
  lateDays: number
  holdReason: string | null
  waitingOn: string | null
  waitingOnIsPerson: boolean
  /** Id orang yang ditunggu, bila yang ditunggu orang di proyek (bukan teks bebas). */
  waitingOnUserId: string | null
  heldSince: string | null
  labels: string[]
  subtaskCount: number
  subtaskDoneCount: number
  lastUpdate: TaskUpdate | null
}

/** Update (laporan progres) terbaru sebuah task; catatan internal tidak pernah ikut. */
export interface TaskUpdate {
  text: string
  authorName: string
  /** Waktu ISO (UTC). */
  createdAt: string
}

export interface TaskProgress {
  done: number
  total: number
  percent: number
}

export interface TaskList {
  projectId: string
  canEdit: boolean
  progress: TaskProgress
  tasks: TaskRow[]
  /** Hari ini menurut server ("YYYY-MM-DD", Asia/Jakarta); dasar tulisan "Kemarin". */
  today: string
}

export interface TaskParent {
  id: string
  key: string
  title: string
}

export interface TaskDetail {
  task: TaskRow
  description: string | null
  /** Boleh mengubah task dan menulis Update / Internal. */
  canEdit: boolean
  /** Boleh menulis komentar biasa (termasuk Tamu). */
  canComment: boolean
  rootProjectId: string
  /** Nama proyek dari root sampai tempat task berada, mis. ["Sentul", "Dispatch"]. */
  projectPath: string[]
  parent: TaskParent | null
  subtasks: TaskRow[]
  today: string
}

export type ActivityKindName = 'Update' | 'Comment' | 'Internal' | 'Log'
export type LogKindName =
  'TaskCreated' | 'StatusChanged' | 'AssigneesChanged' | 'DatesChanged' | 'SubtaskAdded'

export interface ActivityMention {
  userId: string
  name: string
}

/** Isi terstruktur entri Log; hanya bagian yang relevan dengan jenisnya yang ada. */
export interface ActivityData {
  from?: string
  to?: string
  reason?: string
  added?: string[]
  removed?: string[]
  fromStart?: string
  fromDue?: string
  toStart?: string
  toDue?: string
  key?: string
  title?: string
}

export interface ActivityItem {
  id: string
  kind: ActivityKindName
  authorId: string
  authorName: string
  authorIsGuest: boolean
  body: string | null
  mentions: ActivityMention[]
  logKind: LogKindName | null
  data: ActivityData | null
  createdAt: string
  /** Waktu terakhir diubah penulisnya; null bila tidak pernah diubah. */
  editedAt: string | null
}

export interface ActivityPage {
  items: ActivityItem[]
  /** Penanda untuk halaman yang lebih lama; null bila sudah habis. */
  nextBefore: number | null
}

export interface LabelItem {
  id: string
  name: string
}
