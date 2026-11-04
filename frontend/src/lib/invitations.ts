import type { InviteResult } from '@/types/api'

/**
 * Ringkasan hasil "Kirim undangan" untuk toast, mis. "2 undangan dikirim · 1 orang langsung ditambahkan".
 * `problem` true bila ada email yang tidak diproses (akun nonaktif), supaya toast-nya memakai gaya peringatan.
 */
export function summarizeInvites(results: InviteResult[]): { text: string; problem: boolean } {
  const count = (outcome: InviteResult['outcome']) =>
    results.filter((r) => r.outcome === outcome).length
  const invited = count('Diundang')
  const added = count('Ditambahkan')
  const already = count('SudahAnggota')
  const inactive = results.filter((r) => r.outcome === 'AkunNonaktif').map((r) => r.email)

  const parts = [
    invited > 0 ? `${invited} undangan dikirim` : null,
    added > 0 ? `${added} orang langsung ditambahkan (sudah punya akun)` : null,
    already > 0 ? `${already} sudah menjadi anggota` : null,
    inactive.length > 0 ? `akun nonaktif, tidak diundang: ${inactive.join(', ')}` : null,
  ].filter((p): p is string => p !== null)

  return { text: parts.join(' · ') || 'Tidak ada yang diundang', problem: inactive.length > 0 }
}
