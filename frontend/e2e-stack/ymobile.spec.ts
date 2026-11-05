import { expect, test, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Fase 10: dashboard di layar 390px (mockup 11), menu sebagai panel geser, sheet status dan Tambah update,
// serta animasi drawer detail task. Berjalan paling akhir (urutan nama); status yang diubah dikembalikan.
test.use({ storageState: authFile('ahmad') })

const PHONE = { width: 390, height: 844 }

async function openDashboard(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hari Ini', level: 1 })).toBeVisible()
}

test.describe('dashboard di ponsel (mockup 11)', () => {
  test.use({ viewport: PHONE })

  for (const theme of ['light', 'dark'] as const) {
    test(`ringkasan dan kartu Hari Ini, lolos axe, tema ${theme}`, async ({ page }) => {
      await preferTheme(page, theme)
      await openDashboard(page)

      const cards = page.getByRole('group', { name: 'Ringkasan task saya' })
      for (const label of ['Terlambat', 'Minggu ini', 'Dikerjakan', 'Tertahan']) {
        await expect(cards.getByText(label, { exact: true }).filter({ visible: true })).toHaveCount(
          1,
        )
      }
      const late = page.getByRole('group', { name: 'Terlambat' })
      // Judul kelompok "Terlambat · 3" (titik tengahnya dari CSS)
      await expect(late.locator('.ar-todaylist-count')).toHaveText('3')
      await expect(late).toContainText('SEN-115')
      await expect(late.getByRole('button', { name: 'Tambah update untuk SEN-115' })).toBeVisible()

      // Hanya daftar Hari Ini: sapaan, Perlu perhatian, Timeline saya, dan pencarian tidak tampil
      await expect(page.getByRole('region', { name: 'Timeline saya' })).toBeHidden()
      await expect(page.getByRole('region', { name: 'Perlu perhatian' })).toBeHidden()
      await expect(page.getByRole('button', { name: 'Tambah task' })).toBeHidden()
      await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeHidden()
      await expect(page.getByRole('button', { name: 'Notifikasi (4)' })).toBeVisible()

      // Tidak ada gulir ke samping
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      expect(await a11yViolations(page)).toEqual([])
      await expect(page).toHaveScreenshot(`mobile-dashboard-${theme}.png`)
    })
  }

  test('menu membuka sidebar sebagai panel dan tertutup setelah pindah halaman', async ({
    page,
  }) => {
    await openDashboard(page)
    await page.getByRole('button', { name: 'Buka menu' }).click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Sentul', exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    await page.getByRole('button', { name: 'Buka menu' }).click()
    await menu.getByRole('link', { name: 'Tim', exact: true }).click()
    await expect(page).toHaveURL(/\/tim$/)
    await expect(menu).toBeHidden()
  })

  test('status diubah lewat sheet dari bawah, lalu dikembalikan', async ({ page }) => {
    await openDashboard(page)
    const row = page.getByRole('group', { name: 'Jatuh tempo hari ini' })
    await row.getByRole('button', { name: 'Ubah status SEN-112' }).click()
    const sheet = page.getByRole('dialog', { name: 'Ubah status — Paket PenTest whitebox' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'On Progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Sheet menempel di bawah layar (diukur setelah selesai bergeser naik)
    await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
    const box = await sheet.boundingBox()
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(PHONE.height)

    await sheet.getByRole('button', { name: 'Fixing' }).click()
    await expect(sheet).toBeHidden()
    await expect(row.getByRole('button', { name: 'Ubah status SEN-112' })).toContainText('Fixing')

    await row.getByRole('button', { name: 'Ubah status SEN-112' }).click()
    await sheet.getByRole('button', { name: 'On Progress' }).click()
    await expect(row.getByRole('button', { name: 'Ubah status SEN-112' })).toContainText(
      'On Progress',
    )
  })

  test('"Tambah update" terbuka sebagai sheet', async ({ page }) => {
    await openDashboard(page)
    await page.getByRole('button', { name: 'Tambah update untuk SEN-115' }).click()
    const sheet = page.getByRole('dialog', { name: 'Tambah update' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('SEN-115 Pipeline GitLab IRS')
    await sheet.getByRole('button', { name: 'Batal' }).click()
    await expect(sheet).toBeHidden()
  })
})

test.describe('animasi', () => {
  async function openDrawer(page: Page) {
    await page.goto('/')
    await page
      .getByRole('region', { name: 'Hari Ini' })
      .getByRole('button', { name: 'Pipeline GitLab IRS' })
      .click()
    const drawer = page.locator('dialog.ar-drawer')
    await expect(drawer).toBeVisible()
    return drawer
  }

  test('drawer detail task bergeser masuk dari kanan dan keluar kembali', async ({ page }) => {
    const drawer = await openDrawer(page)
    expect(await drawer.evaluate((el) => getComputedStyle(el).animationName)).toBe(
      'ar-slide-in-right',
    )

    // Animasi keluar hanya 160 ms, jadi dicatat dari dalam halaman saat atribut data-closing muncul
    await drawer.evaluate((el) => {
      const seen: { closing: boolean; animation: string; content: boolean }[] = []
      ;(window as unknown as { seen: typeof seen }).seen = seen
      new MutationObserver(() => {
        if (el.hasAttribute('data-closing'))
          seen.push({
            closing: true,
            animation: getComputedStyle(el).animationName,
            content: el.querySelector('.ar-drawer-title') !== null,
          })
      }).observe(el, { attributes: true, attributeFilter: ['data-closing'] })
    })
    await drawer.getByRole('button', { name: 'Tutup', exact: true }).click()
    await expect(drawer).toBeHidden()
    const seen = await page.evaluate(() => (window as unknown as { seen: unknown[] }).seen)
    expect(seen[0]).toEqual({ closing: true, animation: 'ar-slide-out-right', content: true })
    // Setelah tertutup, drawer dilepas dari halaman
    await expect(drawer).toHaveCount(0)
    await expect(page).not.toHaveURL(/task=/)
  })

  test('pengguna yang memilih "kurangi gerakan" tidak mendapat animasi geser', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const drawer = await openDrawer(page)
    expect(
      await drawer.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) * 1000),
    ).toBeLessThan(1)
    await drawer.getByRole('button', { name: 'Tutup', exact: true }).click()
    await expect(drawer).toBeHidden()
  })
})
