import { randomBytes } from 'node:crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Fase 8: undang lewat email, terima undangan, dan tampilan Tamu (mockup 08, 09). Berkas ini berjalan PALING AKHIR
// (urutan nama), karena membuat akun tamu baru. Akun itu dikeluarkan dari proyek dan dinonaktifkan di akhir test.
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

/** Tautan undangan (bagian setelah domain) dari email terbaru untuk alamat itu di Mailpit. */
async function inviteLink(request: APIRequestContext, email: string): Promise<string> {
  const search = () =>
    request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
  await expect
    .poll(async () => ((await (await search()).json()).messages?.length ?? 0) as number, {
      timeout: 15_000,
    })
    .toBeGreaterThan(0)
  const list = (await (await search()).json()) as { messages: { ID: string }[] }
  const message = (await (
    await request.get(`${MAILPIT}/api/v1/message/${list.messages[0]?.ID}`)
  ).json()) as { Subject: string; Text: string }
  expect(message.Subject).toBe('Undangan ke Sentul di Ariadne')
  const path = /(\/undangan#token=\S+)/.exec(message.Text)?.[1]
  if (!path) throw new Error('Tautan undangan tidak ada di email')
  return path
}

async function openMembers(page: Page) {
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Navigasi utama' })
    .getByRole('link', { name: 'Sentul', exact: true })
    .click()
  await page.getByRole('tab', { name: 'Anggota' }).click()
  await expect(page.getByRole('table', { name: 'Anggota Sentul' })).toBeVisible()
}

test.describe('Ahmad mengundang tamu', () => {
  test.use({ storageState: authFile('ahmad') })

  test('dialog Undang seperti mockup 08 dan lolos axe', async ({ page }) => {
    await openMembers(page)
    // Undangan Sari dari data contoh ikut dihitung dan tampil "Menunggu diterima"
    await expect(page.getByText('2 Pengelola · 6 Anggota · 2 Tamu')).toBeVisible()
    const sari = page.getByRole('row').filter({ hasText: 'sari@klien.example' })
    await expect(sari).toContainText('Menunggu diterima')
    await expect(
      sari.getByRole('button', { name: 'Batalkan undangan sari@klien.example' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Undang', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Undang ke Sentul' })
    await expect(dialog.getByRole('radio', { name: /Tamu/ })).toBeChecked()
    await dialog.getByLabel('Email').fill('tim-it@klien.example,')
    await dialog
      .getByLabel(/Pesan/)
      .fill('Halo tim IT, ini akses untuk memantau progres Sentul dan membalas pertanyaan di task.')
    expect(await a11yViolations(page)).toEqual([])
    await expect(page).toHaveScreenshot('undang-dialog.png')
    await dialog.getByRole('button', { name: 'Batal' }).click()
    await expect(dialog).toBeHidden()
  })

  test('undang → email di Mailpit → terima → masuk sebagai Tamu yang hanya melihat Sentul', async ({
    page,
    request,
    browser,
  }) => {
    const email = `tamu-e2e-${Date.now()}@klien.example`
    const password = randomBytes(18).toString('base64url')
    const projectId = await sentulId(request)

    await openMembers(page)
    await page.getByRole('button', { name: 'Undang', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Undang ke Sentul' })
    await dialog.getByLabel('Email').fill(email)
    await dialog.getByRole('button', { name: 'Kirim undangan' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('1 undangan dikirim')).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: email })).toContainText(
      'Menunggu diterima',
    )

    const link = await inviteLink(request, email)

    // Orang yang diundang: browser baru tanpa sesi siapa pun
    const guestContext = await browser.newContext()
    const guest = await guestContext.newPage()
    let userId: string | undefined
    try {
      await guest.goto(link)
      await expect(guest.getByRole('heading', { name: 'Bergabung ke Sentul' })).toBeVisible()
      // Token langsung dihapus dari bilah alamat
      await expect(guest).toHaveURL(/\/undangan$/)
      expect(await a11yViolations(guest)).toEqual([])
      await guest.getByLabel('Nama').fill('Tamu E2E')
      await guest.getByLabel('Password', { exact: true }).fill(password)
      await guest.getByLabel('Ulangi password').fill(password)
      await guest.getByRole('button', { name: 'Buat akun dan masuk' }).click()

      await expect(guest).toHaveURL(new RegExp(`/proyek/${projectId}/tabel`))
      await expect(guest.getByText(/Anda melihat sebagai/)).toContainText('Tamu')
      const nav = guest.getByRole('navigation', { name: 'Navigasi utama' })
      await expect(nav.getByRole('link', { name: 'Sentul', exact: true })).toBeVisible()
      await expect(nav.getByRole('link', { name: /Migrasi Data Center/ })).toHaveCount(0)
      await expect(nav.getByRole('link', { name: 'Timeline Tim' })).toHaveCount(0)
      await expect(nav.getByRole('link', { name: 'Tim' })).toHaveCount(0)
      await expect(guest.getByRole('button', { name: 'Tambah task' })).toHaveCount(0)
      await expect(guest.getByRole('button', { name: 'Undang', exact: true })).toHaveCount(0)

      // Tautan yang sama tidak bisa dipakai lagi
      const again = await request.post('/api/invitations/preview', {
        headers: HEADERS,
        data: { token: decodeURIComponent(link.split('token=')[1] ?? '') },
      })
      expect(again.status()).toBe(400)

      userId = ((await (await guest.request.get('/api/auth/me')).json()) as { id: string }).id
    } finally {
      await guestContext.close()
      // Bersihkan: keluarkan dari proyek dan nonaktifkan, supaya data contoh tetap seperti mockup
      if (userId) {
        await request.delete(`/api/projects/${projectId}/members/${userId}`, { headers: HEADERS })
        await request.patch(`/api/users/${userId}`, { headers: HEADERS, data: { isActive: false } })
      }
    }
  })

  test('undangan bisa dibatalkan dan tautannya berhenti berlaku', async ({ page, request }) => {
    const email = `batal-e2e-${Date.now()}@klien.example`
    const projectId = await sentulId(request)
    const created = await request.post(`/api/projects/${projectId}/invitations`, {
      headers: HEADERS,
      data: { emails: [email], role: 'Tamu' },
    })
    expect(created.status()).toBe(200)
    const link = await inviteLink(request, email)

    await openMembers(page)
    await page.getByRole('button', { name: `Batalkan undangan ${email}` }).click()
    await expect(page.getByText(`Undangan ${email} dibatalkan`)).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: email })).toHaveCount(0)

    await page.goto(link)
    await expect(page.getByText('Undangan tidak bisa dipakai', { exact: true })).toBeVisible()
  })
})

test.describe('tampilan Tamu (mockup 09)', () => {
  test.use({ storageState: authFile('budi') })

  for (const theme of ['light', 'dark'] as const) {
    test(`tabel Sentul dan drawer SEN-115 sebagai Pak Budi, tema ${theme}`, async ({
      page,
      request,
    }) => {
      await preferTheme(page, theme)
      await page.goto(`/proyek/${await sentulId(request)}/tabel?task=SEN-115`)
      const drawer = page.locator('dialog.ar-drawer')
      await expect(drawer).toBeVisible()
      await expect(drawer).toContainText('Pipeline GitLab IRS')
      await expect(page.getByText(/Anda melihat sebagai/)).toBeVisible()
      // Kotak tulis hanya punya Komentar; tidak ada Update atau Internal (rincinya di tugas-detail.spec.ts)
      await expect(drawer.getByRole('button', { name: 'Komentar', exact: true })).toBeVisible()
      await expect(drawer.getByRole('button', { name: 'Update', exact: true })).toHaveCount(0)
      await expect(drawer.getByRole('button', { name: 'Internal', exact: true })).toHaveCount(0)
      expect(await a11yViolations(page)).toEqual([])
      await expect(page).toHaveScreenshot(`tamu-sentul-${theme}.png`)
    })
  }
})
