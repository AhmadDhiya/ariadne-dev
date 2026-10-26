import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { a11yViolations, authFile, type UserKey } from './helpers'

const CSRF = { 'X-Requested-With': 'ariadne' }

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Navigasi utama' })

async function projectIds(request: APIRequestContext) {
  const tree = (await (await request.get('/api/projects/tree')).json()) as {
    id: string
    name: string
  }[]
  return Object.fromEntries(tree.map((p) => [p.name, p.id])) as Record<string, string>
}

async function asUser<T>(browser: Browser, user: UserKey, run: (page: Page) => Promise<T>) {
  const context = await browser.newContext({ storageState: authFile(user) })
  try {
    return await run(await context.newPage())
  } finally {
    await context.close()
  }
}

test.describe('Wiwiet (anggota biasa, bukan supervisor)', () => {
  test.use({ storageState: authFile('wiwiet') })

  test('menu yang bukan haknya disembunyikan, bukan dinonaktifkan', async ({ page }) => {
    await page.goto('/')
    await expect(sidebar(page).getByRole('link', { name: 'Tim', exact: true })).toBeVisible()
    await expect(sidebar(page).getByRole('link', { name: 'Pengaturan' })).toHaveCount(0)
    await expect(sidebar(page).getByRole('link', { name: 'Timeline Tim' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Menu akun Wiwiet' })).toContainText('Anggota')
  })

  test('halaman Tim hanya bisa dilihat: tidak ada tombol ubah', async ({ page }) => {
    await page.goto('/tim')
    // Wiwiet anggota Tim Sentul dan Tim Infrastruktur, bukan Tim QA
    const list = page.getByRole('navigation', { name: 'Daftar tim' })
    await expect(list.getByRole('link')).toHaveCount(2)
    await expect(list.getByRole('link', { name: /Tim QA/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Buat tim' })).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: 'Tambah anggota' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Keluarkan / })).toHaveCount(0)
    expect(await a11yViolations(page)).toEqual([])
  })

  test('anggota proyek hanya bisa dilihat; alamat Pengaturan menampilkan halaman tidak ditemukan', async ({
    page,
  }) => {
    await page.goto('/')
    await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
    await page.getByRole('tab', { name: 'Anggota' }).click()
    await expect(page.getByRole('table', { name: 'Anggota Sentul' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /^Peran / })).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: 'Tambah anggota' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tambah sub-proyek' })).toHaveCount(0)

    await page.goto('/pengaturan')
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()
  })

  test('API menolak aksi yang bukan haknya, walau tombolnya tidak ada', async ({ request }) => {
    const ids = await projectIds(request)
    const forbidden = [
      request.get('/api/users'),
      request.post('/api/users', {
        headers: CSRF,
        data: { email: 'x@perusahaan.co.id', displayName: 'X' },
      }),
      request.post('/api/teams', { headers: CSRF, data: { name: 'Tim Liar' } }),
      request.post(`/api/projects/${ids['Sentul']}/members`, {
        headers: CSRF,
        data: { userId: crypto.randomUUID(), role: 'Anggota' },
      }),
      request.post(`/api/projects/${ids['Sentul']}/children`, {
        headers: CSRF,
        data: { name: 'Liar' },
      }),
    ]
    for (const response of await Promise.all(forbidden)) {
      expect(response.status(), response.url()).toBe(403)
    }
  })
})

test.describe('Pak Budi (Tamu klien)', () => {
  test.use({ storageState: authFile('budi') })

  test('hanya melihat proyek yang dibagikan, dengan banner Tamu dan tanpa menu internal', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText(/Anda melihat sebagai/)).toContainText('Tamu')
    const nav = sidebar(page)
    await expect(nav.getByRole('link', { name: 'Sentul', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Migrasi Data Center' })).toHaveCount(0)
    for (const name of ['Tim', 'Pengaturan', 'Timeline Tim']) {
      await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: 'Menu akun Pak Budi' })).toContainText('Tamu')
  })

  test('daftar anggota proyek tanpa email dan tanpa kontrol ubah', async ({ page }) => {
    await page.goto('/')
    await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
    await page.getByRole('tab', { name: 'Anggota' }).click()

    const table = page.getByRole('table', { name: 'Anggota Sentul' })
    await expect(table.getByRole('row')).toHaveCount(10)
    await expect(table.getByText('@perusahaan.co.id')).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: /^Peran / })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tambah sub-proyek' })).toHaveCount(0)
    expect(await a11yViolations(page)).toEqual([])
  })

  test('alamat Tim dan Pengaturan tidak menampilkan data apa pun', async ({ page }) => {
    for (const path of ['/tim', '/pengaturan']) {
      await page.goto(path)
      await expect(page.getByText('Halaman tidak ditemukan', { exact: true })).toBeVisible()
    }
  })

  test('API: proyek lain 404 (keberadaannya tidak dibocorkan), tim dan pengguna 403', async ({
    page,
    browser,
  }) => {
    const ahmadIds = await asUser(browser, 'ahmad', (p) => projectIds(p.request))
    const request = page.request

    const mine = await projectIds(request)
    expect(Object.keys(mine)).not.toContain('Migrasi Data Center')

    expect((await request.get(`/api/projects/${ahmadIds['Migrasi Data Center']}`)).status()).toBe(
      404,
    )
    expect(
      (await request.get(`/api/projects/${ahmadIds['Migrasi Data Center']}/members`)).status(),
    ).toBe(404)
    expect((await request.get('/api/teams')).status()).toBe(403)
    expect((await request.get('/api/users')).status()).toBe(403)
    expect((await request.get('/api/users/lookup?q=a')).status()).toBe(403)

    // Aksi ubah pada proyek yang boleh dilihat tetap ditolak (bukan 404: ia tahu proyeknya ada)
    expect(
      (
        await request.post(`/api/projects/${ahmadIds['Sentul']}/children`, {
          headers: CSRF,
          data: { name: 'Liar' },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await request.post(`/api/projects/${ahmadIds['Sentul']}/members`, {
          headers: CSRF,
          data: { userId: crypto.randomUUID(), role: 'Anggota' },
        })
      ).status(),
    ).toBe(403)
  })
})

test.describe('Perlindungan di luar peran', () => {
  test('tanpa login, semua API (selain masuk dan lupa password) menjawab 401', async ({
    request,
  }) => {
    for (const path of ['/api/auth/me', '/api/projects/tree', '/api/teams', '/api/users']) {
      expect((await request.get(path)).status(), path).toBe(401)
    }
  })

  test.describe('sudah login', () => {
    test.use({ storageState: authFile('ahmad') })

    test('permintaan ubah tanpa header CSRF ditolak walau cookie sah', async ({ request }) => {
      const response = await request.post('/api/teams', { data: { name: 'Tanpa Header' } })
      expect(response.status()).toBe(403)
      const teams = (await (await request.get('/api/teams')).json()) as { name: string }[]
      expect(teams.map((t) => t.name)).not.toContain('Tanpa Header')
    })

    test('header keamanan terpasang di halaman dan API', async ({ request }) => {
      for (const path of ['/', '/api/auth/me']) {
        const headers = (await request.get(path)).headers()
        expect(headers['x-content-type-options'], path).toBe('nosniff')
        expect(headers['content-security-policy'] ?? '', path).toContain("frame-ancestors 'none'")
        expect(headers['referrer-policy'], path).toBeTruthy()
      }
    })
  })
})
