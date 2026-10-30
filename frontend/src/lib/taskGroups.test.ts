import { describe, expect, it } from 'vitest'
import type { ProjectNode, TaskRow } from '@/types/api'
import { buildTaskGroups, projectOptions } from './taskGroups'

const node = (
  id: string,
  name: string,
  depth: number,
  parentId: string | null,
  sortOrder = 1,
): ProjectNode => ({
  id,
  name,
  depth,
  parentId,
  rootId: parentId === null ? id : 'sen',
  code: depth === 0 ? 'SEN' : null,
  sortOrder,
  taskCount: 0,
})

const TREE = [
  node('sen', 'Sentul', 0, null),
  node('dis', 'Dispatch', 1, 'sen', 1),
  node('slm', 'SLMS', 1, 'sen', 2),
  node('tem', 'Temuan UAT & API', 2, 'slm'),
  node('faq', 'FAQ', 1, 'sen', 3),
  node('mdc', 'Migrasi Data Center', 0, null),
]

const task = (id: string, projectId: string): TaskRow => ({
  id,
  key: `SEN-${id}`,
  number: 1,
  projectId,
  parentTaskId: null,
  title: id,
  status: 'NotStarted',
  priority: 'Medium',
  assignees: [],
  startDate: null,
  dueDate: null,
  durationDays: null,
  isOverdue: false,
  lateDays: 0,
  holdReason: null,
  waitingOn: null,
  waitingOnIsPerson: false,
  waitingOnUserId: null,
  heldSince: null,
  labels: [],
  subtaskCount: 0,
  subtaskDoneCount: 0,
  lastUpdate: null,
})

describe('buildTaskGroups', () => {
  it('mengelompokkan task per sub-proyek mengikuti urutan pohon, dengan nama jalur tanpa proyek root', () => {
    const groups = buildTaskGroups(
      TREE,
      'sen',
      [task('1', 'tem'), task('2', 'dis'), task('3', 'dis')],
      false,
    )

    expect(groups.map((g) => g.label)).toEqual([
      'Sentul',
      'Dispatch',
      'SLMS',
      'SLMS / Temuan UAT & API',
      'FAQ',
    ])
    expect(groups.find((g) => g.id === 'dis')?.tasks.map((t) => t.id)).toEqual(['2', '3'])
    expect(groups.find((g) => g.id === 'tem')?.tasks.map((t) => t.id)).toEqual(['1'])
  })

  it('tidak pernah menyertakan proyek lain', () => {
    const groups = buildTaskGroups(TREE, 'sen', [], false)

    expect(groups.map((g) => g.id)).not.toContain('mdc')
  })

  it('di sub-proyek, grupnya hanya dirinya dan turunannya; namanya tetap memakai jalur lengkap', () => {
    const groups = buildTaskGroups(TREE, 'slm', [task('1', 'tem')], false)

    expect(groups.map((g) => g.label)).toEqual(['SLMS', 'SLMS / Temuan UAT & API'])
  })

  it('grup kosong disembunyikan bila diminta (saat ada filter)', () => {
    const groups = buildTaskGroups(TREE, 'sen', [task('1', 'dis')], true)

    expect(groups.map((g) => g.id)).toEqual(['dis'])
  })
})

describe('projectOptions', () => {
  it('menawarkan proyek ini dan semua turunannya dengan nama jalurnya', () => {
    expect(projectOptions(TREE, 'sen')).toEqual([
      { id: 'sen', label: 'Sentul' },
      { id: 'dis', label: 'Dispatch' },
      { id: 'slm', label: 'SLMS' },
      { id: 'tem', label: 'SLMS / Temuan UAT & API' },
      { id: 'faq', label: 'FAQ' },
    ])
  })
})
