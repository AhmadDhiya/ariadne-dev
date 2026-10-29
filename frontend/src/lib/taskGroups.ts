import { flattenTree } from '@/lib/projectTree'
import type { ProjectNode, TaskRow } from '@/types/api'

export interface TaskGroupData {
  id: string
  /** "Dispatch", atau "SLMS / Temuan UAT & API" untuk sub-sub-proyek. */
  label: string
  tasks: TaskRow[]
}

/** Proyek yang sedang dilihat beserta semua turunannya, urut seperti pohon sidebar (induk lalu anak-anaknya). */
function subtreeOf(nodes: ProjectNode[], projectId: string): ProjectNode[] {
  const ordered = flattenTree(nodes)
  const inside = new Set([projectId])
  // flattenTree mengurutkan induk sebelum anak, jadi satu putaran cukup
  return ordered.filter((node) => {
    if (node.id === projectId) return true
    if (node.parentId && inside.has(node.parentId)) {
      inside.add(node.id)
      return true
    }
    return false
  })
}

/** Nama grup: jalur dari sub-proyek tingkat 1 ke bawah, tanpa nama proyek root; proyek root sendiri memakai namanya. */
function groupLabels(nodes: ProjectNode[]): Map<string, string> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const labels = new Map<string, string>()
  for (const node of nodes) {
    const names: string[] = []
    for (
      let current: ProjectNode | undefined = node;
      current;
      current = byId.get(current.parentId ?? '')
    ) {
      if (current.parentId === null && node.parentId !== null) break
      names.unshift(current.name)
    }
    labels.set(node.id, names.join(' / '))
  }
  return labels
}

/**
 * Mengelompokkan task per (sub-)proyek untuk tabel. Urutan grup mengikuti pohon proyek; urutan task di dalam grup
 * mengikuti urutan dari server. Grup tanpa task disembunyikan bila `hideEmpty` (mis. saat ada filter).
 */
export function buildTaskGroups(
  tree: ProjectNode[],
  projectId: string,
  tasks: TaskRow[],
  hideEmpty: boolean,
): TaskGroupData[] {
  const nodes = subtreeOf(tree, projectId)
  const labels = groupLabels(tree)
  const byProject = new Map<string, TaskRow[]>()
  for (const task of tasks) {
    byProject.set(task.projectId, [...(byProject.get(task.projectId) ?? []), task])
  }

  return nodes
    .map((node) => ({
      id: node.id,
      label: labels.get(node.id) ?? node.name,
      tasks: byProject.get(node.id) ?? [],
    }))
    .filter((group) => !hideEmpty || group.tasks.length > 0)
}

/** Pilihan sub-proyek di form task: proyek yang dilihat dan semua turunannya, dengan nama jalurnya. */
export function projectOptions(
  tree: ProjectNode[],
  projectId: string,
): { id: string; label: string }[] {
  const labels = groupLabels(tree)
  return subtreeOf(tree, projectId).map((node) => ({
    id: node.id,
    label: labels.get(node.id) ?? node.name,
  }))
}
