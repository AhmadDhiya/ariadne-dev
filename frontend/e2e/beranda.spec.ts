import { expect, test } from '@playwright/test'
import { accessibilityViolations, openWithTheme } from './helpers'

test.describe('beranda (sementara, Fase 1)', () => {
  test('server tersambung', async ({ page }) => {
    await page.route('/api/health', (route) =>
      route.fulfill({ json: { status: 'ok', database: 'ok' } }),
    )
    await openWithTheme(page, '/', 'light')
    await expect(page.getByRole('status')).toHaveText('Server dan database tersambung')
    expect(await accessibilityViolations(page)).toEqual([])
  })

  test('server/database mati: pesan jelas tanpa detail teknis', async ({ page }) => {
    await page.route('/api/health', (route) =>
      route.fulfill({ status: 503, json: { status: 'degraded', database: 'unreachable' } }),
    )
    await openWithTheme(page, '/', 'dark')
    await expect(page.getByRole('status')).toHaveText('Server atau database belum tersambung')
    expect(await accessibilityViolations(page)).toEqual([])
  })

  test('alamat tidak dikenal menampilkan halaman tidak ditemukan', async ({ page }) => {
    await openWithTheme(page, '/tidak-ada', 'light')
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()
  })
})
