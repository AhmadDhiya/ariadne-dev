import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Logo } from '@/components/molecules/Logo'
import { NavItem } from '@/components/molecules/NavItem'
import { ancestorIds, buildTree, type TreeNode } from '@/lib/projectTree'
import type { ProjectNode } from '@/types/api'
import './Sidebar.css'

export type TopLevelKey = 'dashboard' | 'timeline' | 'tim' | 'pengaturan'

export interface SidebarProps {
  /** Pohon proyek dalam daftar datar (urutan dari server), sudah dibatasi sesuai hak pengguna. */
  projects: ProjectNode[]
  /** Halaman tingkat atas yang sedang dibuka, atau null saat di halaman proyek. */
  activeKey: TopLevelKey | null
  activeProjectId: string | null
  /** Menu-menu ini disembunyikan (bukan dinonaktifkan) bila bukan haknya. */
  showTimeline: boolean
  showTeams: boolean
  showSettings: boolean
  onNavigate: (href: string) => void
}

/**
 * Sidebar 248px: logo, menu utama, dan pohon proyek bertingkat (maks. 3 level) yang bisa dilipat.
 * Menu yang bukan hak pengguna disembunyikan, bukan dinonaktifkan; server tetap menegakkan izinnya.
 */
export function Sidebar({
  projects,
  activeKey,
  activeProjectId,
  showTimeline,
  showTeams,
  showSettings,
  onNavigate,
}: SidebarProps) {
  const tree = useMemo(() => buildTree(projects), [projects])
  const activeAncestors = useMemo(
    () => ancestorIds(projects, activeProjectId),
    [projects, activeProjectId],
  )
  // Pilihan buka/tutup dari pengguna menang atas aturan bawaan
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

  // Terbuka bila: pengguna membukanya; ia induk dari proyek aktif; ia sendiri proyek aktif (anak-anaknya
  // terlihat, seperti mockup 03/04); atau belum ada proyek aktif dan ia proyek pertama.
  const isOpen = (node: TreeNode) =>
    toggled[node.id] ??
    (activeAncestors.has(node.id) ||
      node.id === activeProjectId ||
      (activeProjectId === null && node === tree[0]))

  /** Klik biasa memakai router; Ctrl/Cmd/Shift-klik tetap membuka tab baru seperti tautan biasa. */
  const go = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onNavigate(href)
  }

  function renderNode(node: TreeNode): ReactNode {
    const open = isOpen(node)
    const href = `/proyek/${node.id}`
    return (
      <div key={node.id}>
        <NavItem
          label={node.name}
          icon={node.depth === 0 ? 'folder' : undefined}
          depth={Math.min(node.depth, 2) as 0 | 1 | 2}
          expandable={node.children.length > 0}
          expanded={open}
          active={node.id === activeProjectId}
          // Proyek yang terbuka tidak menampilkan angka; angkanya ada di anak-anaknya (mockup 03)
          count={open && node.children.length > 0 ? undefined : node.taskCount || undefined}
          href={href}
          onNavigate={go(href)}
          onToggle={() => setToggled((t) => ({ ...t, [node.id]: !open }))}
        />
        {open ? node.children.map(renderNode) : null}
      </div>
    )
  }

  return (
    <nav className="ar-sidebar" aria-label="Navigasi utama">
      <div className="ar-sidebar-logo">
        <Logo size={28} />
      </div>
      <NavItem
        label="Dashboard"
        icon="dashboard"
        href="/"
        active={activeKey === 'dashboard'}
        onNavigate={go('/')}
      />
      {showTimeline ? (
        <NavItem
          label="Timeline Tim"
          icon="timeline"
          href="/timeline-tim"
          active={activeKey === 'timeline'}
          onNavigate={go('/timeline-tim')}
        />
      ) : null}

      {tree.length > 0 ? (
        <>
          <div className="ar-sidebar-heading" id="sidebar-proyek">
            Proyek
          </div>
          <div aria-labelledby="sidebar-proyek" role="group">
            {tree.map(renderNode)}
          </div>
        </>
      ) : null}

      {showTeams || showSettings ? <div className="ar-sidebar-divider" role="separator" /> : null}
      {showTeams ? (
        <NavItem
          label="Tim"
          icon="users"
          href="/tim"
          active={activeKey === 'tim'}
          onNavigate={go('/tim')}
        />
      ) : null}
      {showSettings ? (
        <NavItem
          label="Pengaturan"
          icon="settings"
          href="/pengaturan"
          active={activeKey === 'pengaturan'}
          onNavigate={go('/pengaturan')}
        />
      ) : null}
    </nav>
  )
}
