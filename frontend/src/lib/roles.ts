import type { Me } from '@/types/api'

/**
 * Keterangan peran di bawah nama pada topbar, mis. "Supervisor · Tim Sentul". Hanya tampilan: hak akses
 * sebenarnya selalu diputuskan server.
 */
export function roleSubtitle(
  me: Pick<Me, 'isAdmin' | 'isSupervisor' | 'isGuestOnly' | 'teams'>,
): string {
  if (me.isGuestOnly) return 'Tamu'

  const supervised = me.teams.filter((t) => t.role === 'Supervisor')
  const first = supervised[0] ?? me.teams[0]
  const prefix = me.isSupervisor ? 'Supervisor' : me.isAdmin ? 'Admin' : 'Anggota'

  // Admin yang juga supervisor tampil sebagai Supervisor, seperti mockup
  return first ? `${prefix} · ${first.name}` : prefix
}
