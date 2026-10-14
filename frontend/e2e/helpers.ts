import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

export type Theme = 'light' | 'dark'

/** Membuka halaman dengan tema tertentu dan menunggu huruf IBM Plex selesai dimuat. */
export async function openWithTheme(page: Page, path: string, theme: Theme) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('ariadne.theme', t)
    } catch {
      // abaikan
    }
  }, theme)
  await page.goto(path)
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

/**
 * Satu-satunya pengecualian yang disengaja: kata label prioritas ("High", "Medium") berwarna
 * prioritas seperti mockup, walau di tema terang kontrasnya 3,85–4,06:1 (syarat 4,5:1).
 * Keputusan Ahmad 14 Okt 2026, dicatat di docs/rencana.md bagian 7. Elemennya hanya berisi
 * teks yang selalu berdampingan dengan ikon, jadi mengecualikannya tidak menyembunyikan
 * pelanggaran lain.
 */
const ACCEPTED_LOW_CONTRAST = '.ar-prio > span'

/** Pelanggaran WCAG 2.1 A/AA, diringkas supaya mudah dibaca saat gagal. */
export async function accessibilityViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude(ACCEPTED_LOW_CONTRAST)
  if (include) builder = builder.include(include)
  const results = await builder.analyze()
  return results.violations.map(
    (v) => `${v.id} (${v.nodes.length}×): ${v.help} → ${v.nodes[0]?.target.join(' ')}`,
  )
}
