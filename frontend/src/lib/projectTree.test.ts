import { describe, expect, it } from 'vitest'
import type { ProjectNode } from '@/types/api'
import { ancestorIds, buildTree, flattenTree } from './projectTree'

const node = (id: string, parentId: string | null, depth: number, name = id): ProjectNode => ({
  id,
  parentId,
  rootId: 'sentul',
  depth,
  name,
  code: null,
  sortOrder: 0,
  taskCount: 0,
})

const sample = [
  node('sentul', null, 0),
  node('migrasi', null, 0),
  node('dispatch', 'sentul', 1),
  node('slms', 'sentul', 1),
  node('temuan', 'slms', 2),
]

describe('projectTree', () => {
  it('menyusun pohon dan menjaga urutan saudara', () => {
    const tree = buildTree(sample)

    expect(tree.map((n) => n.id)).toEqual(['sentul', 'migrasi'])
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['dispatch', 'slms'])
    expect(tree[0]?.children[1]?.children.map((n) => n.id)).toEqual(['temuan'])
  })

  it('daftar datar berurutan induk sebelum anak', () => {
    expect(flattenTree(sample).map((n) => n.id)).toEqual([
      'sentul',
      'dispatch',
      'slms',
      'temuan',
      'migrasi',
    ])
  })

  it('simpul yang induknya tidak terlihat dianggap akar, bukan hilang', () => {
    const partial = [node('slms', 'sentul', 1), node('temuan', 'slms', 2)]

    expect(buildTree(partial).map((n) => n.id)).toEqual(['slms'])
    expect(flattenTree(partial).map((n) => n.id)).toEqual(['slms', 'temuan'])
  })

  it('mencari semua induk dari proyek aktif', () => {
    expect([...ancestorIds(sample, 'temuan')].sort()).toEqual(['sentul', 'slms'])
    expect([...ancestorIds(sample, 'sentul')]).toEqual([])
    expect([...ancestorIds(sample, null)]).toEqual([])
    expect([...ancestorIds(sample, 'tidak-ada')]).toEqual([])
  })
})
