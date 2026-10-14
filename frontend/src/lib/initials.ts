/**
 * Inisial untuk avatar, sama dengan design system:
 * dua kata → huruf pertama tiap kata ("Pak Budi" → "PB"); satu kata → dua huruf pertama ("Wiwiet" → "WI").
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const [first = '?', second] = parts
  const letters = first.charAt(0) + (second ? second.charAt(0) : first.charAt(1))
  return letters.toUpperCase()
}
