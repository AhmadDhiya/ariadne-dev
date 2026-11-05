import { expect, test, type APIRequestContext } from '@playwright/test'
import { a11yViolations, authFile, preferTheme, USERS } from './helpers'

// Fase 9: lonceng dan panel notifikasi (mockup 10), email segera lewat Mailpit, dan halaman Semua notifikasi.
// Berjalan sebelum xundangan-tamu (urutan nama). Notifikasi contoh Ahmad tidak ditandai dibaca, supaya tetap seperti mockup.
const MAILPIT = process.env.ARIADNE_MAILPIT_URL ?? 'http://localhost:18025'
const HEADERS = { 'X-Requested-With': 'ariadne' }

async function sentulId(request: APIRequestContext): Promise<string> {
  const tree = (await (await request.get('/api/projects/tree')).json()) as {
    id: string
    name: string
  }[]
  const found = tree.find((p) => p.name === 'Sentul')
  if (!found) throw new Error('Proyek Sentul tidak ada (data contoh belum dibuat?)')
  return found.id
}

test.describe('lonceng Ahmad (data contoh)', () => {
  test.use({ storageState: authFile('ahmad') })

  for (const theme of ['light', 'dark'] as const) {
    test(`panel seperti mockup 10 dan lolos axe, tema ${theme}`, async ({ page }) => {
      await preferTheme(page, theme)
      await page.goto('/')
      const bell = page.getByRole('button', { name: 'Notifikasi (4)' })
      await bell.click()
      const panel = page.getByRole('dialog', { name: 'Notifikasi' })
      await expect(panel.getByRole('region', { name: 'Hari ini' })).toContainText(
        'Syaikhan menyebut Anda di SEN-115',
      )
      await expect(panel).toContainText('Wiwiet menugaskan MDC-24 ke Anda')
      await expect(panel).toContainText('Rencana cut-over · Migrasi Data Center · mulai 5 Okt')
      await expect(panel).toContainText('SEN-121 lewat tenggat 2 hari')
      await expect(panel.getByRole('region', { name: 'Kemarin' })).toContainText(
        'Khalil menyebut Anda di SEN-112',
      )
      await expect(panel.getByText('Belum dibaca', { exact: true })).toHaveCount(4)
      await expect(panel.getByRole('tab', { name: 'Belum dibaca · 4' })).toBeVisible()
      expect(await a11yViolations(page)).toEqual([])
      await expect(page).toHaveScreenshot(`notifikasi-${theme}.png`)

      await panel.getByRole('tab', { name: 'Di-mention' }).click()
      await expect(panel.getByRole('link')).toHaveCount(3) // 2 mention + "Lihat semua notifikasi"
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
      await expect(bell).toBeFocused()
    })
  }

  test('"Lihat semua notifikasi" membuka halaman notifikasi', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Notifikasi/ }).click()
    await page.getByRole('link', { name: 'Lihat semua notifikasi' }).click()
    await expect(page).toHaveURL(/\/notifikasi$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Notifikasi' })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('Syaikhan menyebut Anda di SEN-115')
    expect(await a11yViolations(page)).toEqual([])

    // "Lihat semua" di kartu Perlu perhatian menuju halaman yang sama
    await page.goto('/')
    await page
      .getByRole('region', { name: 'Perlu perhatian' })
      .getByRole('link', { name: 'Lihat semua' })
      .click()
    await expect(page).toHaveURL(/\/notifikasi$/)
  })
})

test.describe('mention sampai ke orangnya', () => {
  test.use({ storageState: authFile('wiwiet') })

  test('Ahmad menandai Wiwiet → email di Mailpit → lonceng Wiwiet → klik membuka task dan menandai dibaca', async ({
    page,
    browser,
    request,
  }) => {
    const ahmad = await browser.newContext({ storageState: authFile('ahmad') })
    const projectId = await sentulId(ahmad.request)
    const created = await ahmad.request.post(`/api/projects/${projectId}/tasks`, {
      headers: HEADERS,
      data: { title: `Notifikasi e2e ${Date.now()}` },
    })
    expect(created.status()).toBe(201)
    const task = (await created.json()) as { id: string; key: string }
    try {
      const members = (await (
        await ahmad.request.get(`/api/projects/${projectId}/members`)
      ).json()) as { userId: string; displayName: string }[]
      const wiwiet = members.find((m) => m.displayName === USERS.wiwiet.name)
      if (!wiwiet) throw new Error('Wiwiet bukan anggota Sentul')
      const before = (await (await page.request.get('/api/notifications/unread-count')).json()) as {
        count: number
      }

      const posted = await ahmad.request.post(`/api/tasks/${task.id}/activities`, {
        headers: HEADERS,
        data: { kind: 'Comment', body: '@Wiwiet tolong cek ini', mentionUserIds: [wiwiet.userId] },
      })
      expect(posted.status()).toBe(201)

      // Email segera
      const subject = `Ahmad menyebut Anda di ${task.key}`
      await expect
        .poll(
          async () => {
            const found = (await (
              await request.get(
                `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${USERS.wiwiet.email} subject:"${subject}"`)}`,
              )
            ).json()) as { messages?: { Subject: string }[] }
            return found.messages?.[0]?.Subject
          },
          { timeout: 15_000 },
        )
        .toBe(subject)

      await page.goto('/')
      const bell = page.getByRole('button', { name: `Notifikasi (${before.count + 1})` })
      await bell.click()
      await page
        .getByRole('dialog', { name: 'Notifikasi' })
        .getByRole('link', { name: new RegExp(`Ahmad menyebut Anda di ${task.key}`) })
        .click()
      await expect(page).toHaveURL(new RegExp(`/proyek/${projectId}/tabel\\?task=${task.key}`))
      await expect(page.locator('dialog.ar-drawer')).toContainText('@Wiwiet tolong cek ini')
      await expect
        .poll(
          async () =>
            (
              (await (await page.request.get('/api/notifications/unread-count')).json()) as {
                count: number
              }
            ).count,
        )
        .toBe(before.count)
    } finally {
      // Task contoh dihapus lagi (notifikasinya ikut tersembunyi), supaya tabel Sentul tetap seperti mockup
      await ahmad.request.delete(`/api/tasks/${task.id}`, { headers: HEADERS })
      await ahmad.close()
    }
  })
})
