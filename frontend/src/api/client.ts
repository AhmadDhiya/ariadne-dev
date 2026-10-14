/** Kesalahan dari API; pesan teknisnya tidak ditampilkan langsung ke pengguna. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * GET ke API di origin yang sama. Cookie login (HttpOnly) dikirim otomatis oleh browser;
 * tidak ada token yang disimpan di JavaScript (pedoman H2).
 */
export async function apiGet<T>(path: `/api/${string}`, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} gagal dengan status ${response.status}`)
  }
  return (await response.json()) as T
}
