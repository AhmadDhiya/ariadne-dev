import type { ProjectNode } from '@/types/api'

export interface TreeNode extends ProjectNode {
  children: TreeNode[]
}

/** Menyusun daftar datar dari server menjadi pohon; urutan saudara mengikuti urutan dari server. */
export function buildTree(nodes: ProjectNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(nodes.map((n) => [n.id, { ...n, children: [] }]))
  const roots: TreeNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    // Induk yang tidak terlihat (tidak ada di daftar) membuat simpul ini diperlakukan sebagai akar
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** Urutan tampil pohon dari atas ke bawah (induk sebelum anak), untuk daftar bertingkat. */
export function flattenTree(nodes: ProjectNode[]): ProjectNode[] {
  const result: ProjectNode[] = []
  const visit = (node: TreeNode) => {
    const { children, ...plain } = node
    result.push(plain)
    children.forEach(visit)
  }
  buildTree(nodes).forEach(visit)
  return result
}

/** Id semua induk dari proyek yang aktif, supaya jalurnya terbuka di sidebar. */
export function ancestorIds(nodes: ProjectNode[], id: string | null): Set<string> {
  const result = new Set<string>()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (let cur = id ? byId.get(id) : undefined; cur?.parentId; cur = byId.get(cur.parentId)) {
    result.add(cur.parentId)
  }
  return result
}
