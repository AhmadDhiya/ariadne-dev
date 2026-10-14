/**
 * Tujuan pengalihan setelah login yang aman (pedoman B12). Hanya jalur di aplikasi ini yang diterima;
 * alamat penuh ("https://situs-jahat"), "//situs-jahat", dan "/\situs-jahat" dianggap berbahaya dan
 * diganti ke halaman utama.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  // Karakter kontrol (mis. tab, baris baru) dipakai untuk mengelabui penguraian URL
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(next)) return fallback
  // Jangan kembali ke halaman login itu sendiri
  if (next === '/masuk' || next.startsWith('/masuk?')) return fallback
  return next
}
