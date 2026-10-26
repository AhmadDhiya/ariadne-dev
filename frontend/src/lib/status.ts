/**
 * Status dan prioritas, sama persis dengan design system (bundle.js STATUSES / PRIORITIES).
 * Nama tampilan sengaja tetap bahasa Inggris, sesuai kebiasaan tim.
 */
import type { PriorityName, WorkStatusName } from '@/types/api'

export type StatusKey =
  'not-started' | 'progress' | 'fixing' | 'blocked' | 'hold' | 'request' | 'done' | 'routine'

export type PriorityKey = 'critical' | 'high' | 'medium' | 'low'

export interface Status {
  key: StatusKey
  label: string
  /** Status tertahan: butuh alasan dan boleh punya "menunggu siapa". */
  held: boolean
}

export interface Priority {
  key: PriorityKey
  label: string
  /** 0 = paling penting. Dipakai untuk semua urutan "prioritas". */
  rank: number
}

export const STATUSES: readonly Status[] = [
  { key: 'not-started', label: 'Not Started', held: false },
  { key: 'progress', label: 'On Progress', held: false },
  { key: 'fixing', label: 'Fixing', held: false },
  { key: 'blocked', label: 'Blocked', held: true },
  { key: 'hold', label: 'On Hold', held: true },
  { key: 'request', label: 'On Request', held: true },
  { key: 'done', label: 'Done', held: false },
  { key: 'routine', label: 'Rutin', held: false },
]

export const PRIORITIES: readonly Priority[] = [
  { key: 'critical', label: 'Critical', rank: 0 },
  { key: 'high', label: 'High', rank: 1 },
  { key: 'medium', label: 'Medium', rank: 2 },
  { key: 'low', label: 'Low', rank: 3 },
]

const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s])) as Record<
  StatusKey,
  Status
>
const PRIORITY_BY_KEY = Object.fromEntries(PRIORITIES.map((p) => [p.key, p])) as Record<
  PriorityKey,
  Priority
>

export function getStatus(key: StatusKey): Status {
  return STATUS_BY_KEY[key]
}

export function getPriority(key: PriorityKey): Priority {
  return PRIORITY_BY_KEY[key]
}

export type HeldStatusKey = 'blocked' | 'hold' | 'request'

export function isHeld(key: StatusKey): key is HeldStatusKey {
  return STATUS_BY_KEY[key].held
}

// ---------- nama di API ↔ kunci tampilan ----------

const STATUS_API: Record<WorkStatusName, StatusKey> = {
  NotStarted: 'not-started',
  OnProgress: 'progress',
  Fixing: 'fixing',
  Blocked: 'blocked',
  OnHold: 'hold',
  OnRequest: 'request',
  Done: 'done',
  Rutin: 'routine',
}

const PRIORITY_API: Record<PriorityName, PriorityKey> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
}

export const WORK_STATUS_NAMES = Object.keys(STATUS_API) as WorkStatusName[]
export const PRIORITY_NAMES = Object.keys(PRIORITY_API) as PriorityName[]

export const statusFromApi = (name: WorkStatusName): StatusKey => STATUS_API[name]
export const priorityFromApi = (name: PriorityName): PriorityKey => PRIORITY_API[name]

export function statusToApi(key: StatusKey): WorkStatusName {
  return WORK_STATUS_NAMES.find((name) => STATUS_API[name] === key) ?? 'NotStarted'
}

export function priorityToApi(key: PriorityKey): PriorityName {
  return PRIORITY_NAMES.find((name) => PRIORITY_API[name] === key) ?? 'Medium'
}
