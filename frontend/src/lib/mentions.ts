/**
 * Mengolah "@nama" di kotak komentar. Teks disimpan apa adanya (bukan HTML); orang yang ditandai dikirim
 * terpisah sebagai daftar id, dan server memeriksa bahwa "@Nama" memang tertulis di teksnya.
 */

export interface MentionCandidate {
  id: string
  name: string
}

export interface MentionToken {
  /** Posisi "@" di teks. */
  start: number
  /** Ketikan setelah "@" sampai kursor. */
  query: string
}

const MAX_QUERY = 30

/**
 * "@" yang sedang diketik di dekat kursor, bila ada: "@" harus di awal teks atau setelah spasi/baris baru
 * (jadi alamat email tidak memunculkan daftar), dan antara "@" dan kursor tidak boleh ada baris baru.
 */
export function activeMentionToken(text: string, caret: number): MentionToken | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at === -1) return null
  if (at > 0 && !/\s/.test(before.charAt(at - 1))) return null
  const query = before.slice(at + 1)
  if (query.includes('\n') || query.length > MAX_QUERY) return null
  return { start: at, query }
}

/**
 * Calon yang namanya memuat ketikan (tanpa membedakan huruf besar/kecil); yang diawali ketikan lebih dulu.
 * Spasi di ujung ketikan dihitung: "@Rama " (nama sudah selesai) tidak cocok dengan siapa pun sehingga daftar menutup,
 * sedangkan "@Pak " masih cocok dengan "Pak Budi".
 */
export function filterCandidates<T extends MentionCandidate>(
  people: readonly T[],
  query: string,
): T[] {
  const q = query.toLowerCase()
  const starts = (p: T) => p.name.toLowerCase().startsWith(q)
  return people
    .filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => Number(starts(b)) - Number(starts(a)) || a.name.localeCompare(b.name, 'id'))
}

/** Mengganti "@ketikan" dengan "@Nama " dan mengembalikan teks baru beserta posisi kursor sesudahnya. */
export function insertMention(
  text: string,
  token: MentionToken,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const inserted = `@${name} `
  return {
    text: text.slice(0, token.start) + inserted + text.slice(caret),
    caret: token.start + inserted.length,
  }
}

/** Hanya yang namanya masih tertulis sebagai "@Nama" di teks akhir (orang bisa menghapusnya setelah memilih). */
export function mentionedIn(text: string, picks: readonly MentionCandidate[]): string[] {
  return [...new Set(picks.filter((p) => hasMention(text, p.name)).map((p) => p.id))]
}

function hasMention(text: string, name: string): boolean {
  return splitMentions(text, [name]).some((part) => part.mention)
}

export interface TextPart {
  text: string
  mention: boolean
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Memecah teks menjadi bagian biasa dan bagian "@Nama" (tanpa "@" pada `text` bagian mention).
 * Nama harus persis sama dan tidak boleh disambung huruf atau angka ("@Ra" tidak menyorot "@Rama").
 */
export function splitMentions(text: string, names: readonly string[]): TextPart[] {
  const unique = [...new Set(names.filter((n) => n.length > 0))].sort((a, b) => b.length - a.length)
  if (unique.length === 0) return [{ text, mention: false }]

  const pattern = new RegExp(`@(${unique.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'gu')
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), mention: false })
    parts.push({ text: match[1] ?? '', mention: true })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false })
  return parts.length > 0 ? parts : [{ text, mention: false }]
}
