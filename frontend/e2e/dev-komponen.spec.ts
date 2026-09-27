import { expect, test } from '@playwright/test'
import { accessibilityViolations, openWithTheme, type Theme } from './helpers'

const THEMES: Theme[] = ['light', 'dark']

for (const theme of THEMES) {
  test.describe(`katalog komponen, tema ${theme === 'light' ? 'terang' : 'gelap'}`, () => {
    test.beforeEach(async ({ page }) => {
      await openWithTheme(page, '/dev/komponen', theme)
      await expect(page.getByRole('heading', { name: 'Katalog komponen' })).toBeVisible()
    })

    test('lolos pemeriksaan aksesibilitas WCAG 2.1 AA', async ({ page }) => {
      expect(await accessibilityViolations(page)).toEqual([])
    })

    test('tampilan sama dengan screenshot acuan', async ({ page }) => {
      await expect(page).toHaveScreenshot(`dev-komponen-${theme}.png`, { fullPage: true })
    })
  })
}

test.describe('perilaku interaktif', () => {
  test.beforeEach(async ({ page }) => {
    await openWithTheme(page, '/dev/komponen', 'light')
  })

  test('status bisa diubah hanya dengan keyboard', async ({ page }) => {
    // Demo tampil dua kali (terang dan gelap); uji panel terang
    const demo = page
      .getByRole('region', { name: /StatusPill \+ Popover \+ Menu/ })
      .locator('[data-theme="light"]')
    await demo.getByRole('button', { name: 'Ubah status: On Progress' }).click()

    const menu = demo.getByRole('listbox', { name: 'Ubah status' })
    await expect(menu).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect(menu).toBeHidden()
    await expect(demo.getByRole('button', { name: 'Ubah status: Fixing' })).toBeVisible()
  })

  test('dialog Undang: fokus di dalam dialog, lolos axe, Esc menutup', async ({ page }) => {
    await page.getByRole('button', { name: 'Buka dialog Undang' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Undang ke Sentul' })
    await expect(dialog).toBeVisible()

    // Tab berkali-kali tidak pernah keluar dari dialog modal
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)

    expect(await accessibilityViolations(page, 'dialog[open]')).toEqual([])
    // Hanya dialognya: posisi scroll halaman di belakang bisa berbeda antar-run
    await expect(dialog).toHaveScreenshot('dialog-undang.png')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('drawer task terbuka dari kanan dan tertutup dengan tombol ×', async ({ page }) => {
    await page.getByRole('button', { name: 'Buka drawer task' }).first().click()
    const drawer = page.getByRole('dialog', { name: 'Pipeline GitLab IRS' })
    await expect(drawer).toBeVisible()
    const box = await drawer.boundingBox()
    expect(box?.width).toBe(520)
    expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(1440)

    expect(await accessibilityViolations(page, 'dialog[open]')).toEqual([])
    await expect(drawer).toHaveScreenshot('drawer-task.png')

    await drawer.getByRole('button', { name: 'Tutup' }).click()
    await expect(drawer).toBeHidden()
  })

  test('tooltip alasan tertahan muncul saat Tab ke tombol info', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Alasan On Request' }).first()
    await trigger.focus()
    await expect(
      page.getByRole('tooltip').filter({ hasText: 'Menunggu akses VPN' }).first(),
    ).toBeVisible()
  })
})

// Tanpa openWithTheme: skrip awalnya akan memaksa tema terang lagi setiap kali dimuat ulang.
test('pilihan tema tersimpan setelah halaman dimuat ulang', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/dev/komponen')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page
    .getByRole('group', { name: 'Tema halaman' })
    .getByRole('button', { name: 'Gelap' })
    .click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('tanpa pilihan tersimpan, tema mengikuti pengaturan sistem', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
