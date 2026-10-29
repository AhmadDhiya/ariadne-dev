/** Kesalahan dari API. `title` aman ditampilkan ke pengguna; `errors` berisi pesan per kolom isian. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, title: string, errors: Record<string, string[]> = {}) {
    super(title)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** Pesan pertama untuk satu kolom, atau undefined. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

interface ProblemBody {
  title?: string
  errors?: Record<string, string[]>
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

/**
 * Header yang diwajibkan API untuk semua permintaan yang mengubah data (perlindungan CSRF, pedoman B7).
 * Nilainya harus sama dengan CsrfProtection.cs di backend.
 */
const CSRF_HEADERS = { 'X-Requested-With': 'ariadne' }

/**
 * Permintaan ke API di origin yang sama. Cookie login (HttpOnly) dikirim otomatis oleh browser; tidak ada
 * token yang disimpan di JavaScript (pedoman H2).
 */
async function request<T>(
  method: Method,
  path: `/api/${string}`,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') Object.assign(headers, CSRF_HEADERS)
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    let problem: ProblemBody = {}
    try {
      problem = (await response.json()) as ProblemBody
    } catch {
      // Respons tanpa isi JSON (mis. 502 dari nginx): pakai pesan umum di bawah
    }
    throw new ApiError(
      response.status,
      problem.title || 'Terjadi kesalahan. Coba lagi.',
      problem.errors ?? {},
    )
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const apiGet = <T>(path: `/api/${string}`, signal?: AbortSignal) =>
  request<T>('GET', path, undefined, signal)
export const apiPost = <T = void>(path: `/api/${string}`, body?: unknown) =>
  request<T>('POST', path, body ?? {})
export const apiPatch = <T = void>(path: `/api/${string}`, body: unknown) =>
  request<T>('PATCH', path, body)
export const apiPut = <T = void>(path: `/api/${string}`, body: unknown) =>
  request<T>('PUT', path, body)
export const apiDelete = <T = void>(path: `/api/${string}`) => request<T>('DELETE', path)
