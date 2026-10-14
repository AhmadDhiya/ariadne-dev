const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

/** Pemeriksaan format sederhana untuk bantuan di form. Validasi sebenarnya ada di server. */
export function isValidEmail(value: string): boolean {
  return EMAIL.test(value)
}

/** Memecah teks berisi beberapa email yang dipisah koma, titik koma, spasi, atau baris baru. */
export function splitEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}
