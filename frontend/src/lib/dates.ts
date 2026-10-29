/**
 * Format tanggal dan jam sesuai brand book:
 * "28 Sep", "28 Sep – 2 Okt", "Senin, 28 September 2026", jam "09.12".
 *
 * Tanggal task berupa string "YYYY-MM-DD" (tanggal saja, tanpa jam) dan dibaca apa adanya,
 * jadi tidak pernah bergeser karena zona waktu (pedoman E2). Jam dari server (UTC) selalu
 * ditampilkan dalam Asia/Jakarta.
 */
export const TIME_ZONE = 'Asia/Jakarta'

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]
const MONTHS_LONG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export interface CalendarDate {
  year: number
  month: number // 1–12
  day: number
}

/** Membaca "YYYY-MM-DD". Melempar error bila formatnya salah, supaya data rusak tidak diam-diam tampil. */
export function parseDate(iso: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) throw new Error(`Format tanggal tidak dikenal: "${iso}"`)
  const [, y, m, d] = match
  const date = { year: Number(y), month: Number(m), day: Number(d) }
  const check = new Date(Date.UTC(date.year, date.month - 1, date.day))
  if (check.getUTCMonth() !== date.month - 1 || check.getUTCDate() !== date.day) {
    throw new Error(`Tanggal tidak valid: "${iso}"`)
  }
  return date
}

function monthShort(month: number): string {
  return MONTHS_SHORT[month - 1] ?? ''
}

/** "28 Sep"; tahun ditambahkan bila bukan tahun berjalan: "5 Jan 2027". */
export function formatShortDate(iso: string, currentYear?: number): string {
  const { year, month, day } = parseDate(iso)
  const base = `${day} ${monthShort(month)}`
  return currentYear !== undefined && year !== currentYear ? `${base} ${year}` : base
}

/** "28 Sep – 2 Okt". */
export function formatDateRange(startIso: string, endIso: string, currentYear?: number): string {
  return `${formatShortDate(startIso, currentYear)} – ${formatShortDate(endIso, currentYear)}`
}

/** "Senin, 28 September 2026" untuk judul halaman. */
export function formatLongDate(iso: string): string {
  const { year, month, day } = parseDate(iso)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${WEEKDAYS[weekday]}, ${day} ${MONTHS_LONG[month - 1]} ${year}`
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "09.12" dari waktu ISO (UTC) server, dalam Asia/Jakarta. */
export function formatTime(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) throw new Error(`Waktu tidak valid: "${isoDateTime}"`)
  return timeFormatter.format(date).replace(':', '.')
}

const dateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
})

/** "2 Jun 2026": tanggal (dengan tahun) dari waktu ISO server, dalam Asia/Jakarta. Dipakai di kolom "Ditambahkan". */
export function formatDateWithYear(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) throw new Error(`Waktu tidak valid: "${isoDateTime}"`)
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]))
  return `${Number(parts.day)} ${monthShort(Number(parts.month))} ${parts.year}`
}

/** "24 Sep": tanggal (tanpa tahun) dari waktu ISO server, dalam Asia/Jakarta. Dipakai untuk "sejak 24 Sep". */
export function formatShortDateOfInstant(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) throw new Error(`Waktu tidak valid: "${isoDateTime}"`)
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]))
  return `${Number(parts.day)} ${monthShort(Number(parts.month))}`
}
