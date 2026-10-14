import type { MouseEvent } from 'react'
import { cx } from '@/lib/cx'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import type { TeamSummary } from '@/types/api'
import './TeamList.css'

export interface TeamListProps {
  teams: TeamSummary[]
  selectedId: string | null
  onNavigate: (href: string) => void
}

/** Daftar tim di kolom kiri halaman Tim (280px): nama, jumlah orang, supervisor, dan avatar anggota. */
export function TeamList({ teams, selectedId, onNavigate }: TeamListProps) {
  return (
    <nav className="ar-teamlist" aria-label="Daftar tim">
      {teams.map((team) => {
        const href = `/tim/${team.id}`
        const selected = team.id === selectedId
        return (
          <a
            key={team.id}
            href={href}
            className={cx('ar-teamcard', selected && 'is-selected')}
            aria-current={selected ? 'page' : undefined}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
              e.preventDefault()
              onNavigate(href)
            }}
          >
            <span className="ar-teamcard-head">
              <span className="ar-teamcard-name">{team.name}</span>
              <span className="ar-teamcard-count">{team.memberCount} orang</span>
            </span>
            <span className="ar-teamcard-sup">
              {team.supervisors.length > 0
                ? `Supervisor: ${team.supervisors.join(', ')}`
                : 'Belum ada supervisor'}
            </span>
            <AvatarStack names={team.memberNames} max={6} size={22} />
          </a>
        )
      })}
    </nav>
  )
}
