import { ApiError } from './client'

/** Pesan yang aman ditampilkan ke pengguna untuk kesalahan apa pun. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
    if (error.status === 403) return 'Anda tidak punya izin untuk aksi ini.'
    return error.message
  }
  return 'Tidak bisa terhubung ke server. Periksa koneksi Anda lalu coba lagi.'
}

/** Pesan per kolom dari server (400), satu pesan per kolom, untuk ditampilkan di bawah isian. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {}
  return Object.fromEntries(
    Object.entries(error.errors).flatMap(([field, messages]) =>
      messages[0] ? [[field, messages[0]]] : [],
    ),
  )
}
