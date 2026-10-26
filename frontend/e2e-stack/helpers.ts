import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

/** Akun contoh dari mockup. Semuanya memakai password yang sama: SEED_PASSWORD di file .env. */
export const USERS = {
  ahmad: { email: 'ahmad@perusahaan.co.id', name: 'Ahmad' }, // admin + supervisor Tim Sentul dan Tim QA
  wiwiet: { email: 'wiwiet@perusahaan.co.id', name: 'Wiwiet' }, // anggota biasa
  budi: { email: 'budi@klien.example', name: 'Pak Budi' }, // Tamu klien
} as const

export type UserKey = keyof typeof USERS

export const authFile = (user: UserKey) => resolve(import.meta.dirname, `.auth/${user}.json`)

/**
 * Password akun contoh: dari environment (dipakai scripts/check.mjs yang membuat stack sendiri yang terpisah),
 * atau dari SEED_PASSWORD di .env bila stack contoh dinyalakan manual. Nilainya tidak pernah dicetak atau dicatat.
 */
export function seedPassword(): string {
  if (process.env.SEED_PASSWORD) return process.env.SEED_PASSWORD
  const envFile = resolve(import.meta.dirname, '../../.env')
  if (!existsSync(envFile))
    throw new Error('File .env tidak ditemukan di root repo (salin dari .env.example).')
  process.loadEnvFile(envFile)
  const password = process.env.SEED_PASSWORD
  if (!password)
    throw new Error('SEED_PASSWORD di .env kosong: data contoh tidak dibuat, login tidak mungkin.')
  return password
}

/** Pelanggaran WCAG 2.1 A/AA pada halaman yang sedang terbuka. */
export async function a11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Kata label prioritas berwarna sesuai mockup (keputusan Ahmad); tidak ada di halaman Fase 2
    .exclude('.ar-prio > span')
    .analyze()
  return results.violations.map(
    (v) => `${v.id} (${v.nodes.length}×): ${v.help} → ${v.nodes[0]?.target.join(' ')}`,
  )
}

/** Mengganti tema lewat localStorage sebelum halaman dimuat. */
export async function preferTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('ariadne.theme', t), theme)
}
