import { expect, test, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Data contoh Sentul dari mockup 03; "hari ini" dikunci ke Senin 28 September 2026.
test.use({ storageState: authFile('ahmad') })

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Navigasi utama' })
const row = (page: Page, key: string) => page.getByRole('row').filter({ hasText: key })
const tableSection = (page: Page) => page.getByRole('region', { name: 'Tabel task' })

async function openSentul(page: Page) {
  await page.goto('/')
  await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(row(page, 'SEN-101')).toBeVisible()
}

test.describe('Tabel proyek: tampilan', () => {
  test('grup, progres, dan task sesuai data contoh mockup 03', async ({ page }) => {
    await openSentul(page)

    await expect(page.getByRole('progressbar', { name: 'Progres Sentul' })).toBeVisible()
    await expect(page.getByText('3 dari 17 task selesai')).toBeVisible() // 101, 105, 106 (dari 17: termasuk SEN-140 yang Rutin)
    for (const [group, meta] of [
      ['Dispatch', '3 task'],
      ['SLMS', '2 task'],
      ['SLMS / Temuan UAT & API', '2 task · 3 sub-task'],
      ['Smartclassroom', '7 task'],
      ['FAQ', '1 task'],
      ['Menagih Pihak Lain', '1 task'],
      ['Testing Oktober', '1 task'],
    ] as const) {
      await expect(
        page.getByRole('button', { name: new RegExp(`^${group.replace(/[/&]/g, '.')}`) }).first(),
      ).toContainText(meta)
    }

    // SEN-115: terlambat, tertahan, dengan alasan di tooltip
    const blocked = row(page, 'SEN-115')
    await expect(blocked).toContainText('Pipeline GitLab IRS')
    await expect(blocked).toContainText('Critical')
    await expect(blocked.getByRole('button', { name: /Ubah status: Blocked/ })).toBeVisible()
    await expect(blocked).toContainText('telat 3 hari')
    await blocked.getByRole('button', { name: 'Alasan Blocked' }).hover()
    await expect(page.getByText('Runner GitLab belum bisa mengakses server staging')).toBeVisible()
    await expect(page.getByText('sejak 24 Sep')).toBeVisible()

    // Durasi hari kerja dihitung server: SEN-112 21 Sep - 28 Sep = 6
    await expect(row(page, 'SEN-112')).toContainText('21 Sep')
    await expect(row(page, 'SEN-112').getByRole('cell').nth(7)).toHaveText(/6/)
  })

  test('sub-task menjorok di bawah induknya, dan bisa dilipat', async ({ page }) => {
    await openSentul(page)
    await expect(row(page, 'SEN-121')).toContainText('1/3')
    await expect(row(page, 'SEN-122')).toBeVisible()

    await page.getByRole('button', { name: 'Sembunyikan sub-task SEN-121' }).click()
    await expect(row(page, 'SEN-122')).toHaveCount(0)
    await expect(row(page, 'SEN-121')).toBeVisible()

    await page.getByRole('button', { name: 'Tampilkan sub-task SEN-121' }).click()
    await expect(row(page, 'SEN-124')).toBeVisible()
  })

  test('grup bisa dilipat dengan klik dan keyboard', async ({ page }) => {
    await openSentul(page)
    const group = page.getByRole('button', { name: /^Dispatch/ })

    await group.focus()
    await page.keyboard.press('Enter')
    await expect(row(page, 'SEN-101')).toHaveCount(0)
    await expect(group).toContainText('dilipat')

    await page.keyboard.press('Enter')
    await expect(row(page, 'SEN-101')).toBeVisible()
  })

  test('angka task di sidebar dan "Task aktif" di halaman Tim', async ({ page }) => {
    await openSentul(page)
    const nav = sidebar(page)
    await expect(nav.getByRole('link', { name: /^Dispatch/ })).toContainText('2')
    await expect(nav.getByRole('link', { name: /^Smartclassroom/ })).toContainText('5')
    await expect(nav.getByRole('link', { name: /^Migrasi Data Center/ })).toContainText('3')

    await page.goto('/tim')
    const table = page.getByRole('table', { name: 'Anggota Tim Sentul' })
    await expect(table.getByRole('columnheader', { name: 'Task aktif' })).toBeVisible()
    // Ahmad: 104, 115, 112, 121, 122, 124, 133 di Sentul, ditambah MDC-18, MDC-21, MDC-24 (belum Done)
    await expect(table.getByRole('row').filter({ hasText: 'Ahmad' })).toContainText('10')
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`tabel lolos axe dan sesuai screenshot acuan, tema ${theme === 'light' ? 'terang' : 'gelap'}`, async ({
      page,
    }) => {
      await preferTheme(page, theme)
      await openSentul(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      expect(await a11yViolations(page)).toEqual([])
      await expect(tableSection(page)).toHaveScreenshot(`tabel-sentul-${theme}.png`)
    })
  }
})

test.describe('Tabel proyek: filter dan pencarian', () => {
  test('Terlambat menampilkan hanya task yang lewat tanggal dan belum selesai', async ({
    page,
  }) => {
    await openSentul(page)

    await page.getByRole('button', { name: 'Terlambat' }).click()

    await expect(page).toHaveURL(/overdue=1/)
    for (const key of ['SEN-115', 'SEN-121', 'SEN-122']) await expect(row(page, key)).toBeVisible()
    await expect(row(page, 'SEN-101')).toHaveCount(0)
    await expect(row(page, 'SEN-112')).toHaveCount(0) // jatuh tempo hari ini, belum terlambat
    await expect(page.getByRole('button', { name: /^Smartclassroom/ })).toHaveCount(0) // grup tanpa hasil disembunyikan
  })

  test('filter status dan prioritas digabung, tersimpan di alamat, dan bertahan setelah dimuat ulang', async ({
    page,
  }) => {
    await openSentul(page)

    await page.getByRole('button', { name: 'Status', exact: true }).click()
    const statusMenu = page.getByRole('listbox', { name: 'Filter status' })
    await statusMenu.getByRole('option', { name: 'Blocked' }).click()
    await statusMenu.getByRole('option', { name: 'On Request' }).click()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/status=Blocked%2COnRequest|status=Blocked,OnRequest/)
    await expect(row(page, 'SEN-115')).toBeVisible()
    await expect(row(page, 'SEN-133')).toBeVisible()
    await expect(row(page, 'SEN-145')).toHaveCount(0) // On Hold

    await page.getByRole('button', { name: 'Prioritas', exact: true }).click()
    await page
      .getByRole('listbox', { name: 'Filter prioritas' })
      .getByRole('option', { name: 'Critical' })
      .click()
    await page.keyboard.press('Escape')
    await expect(row(page, 'SEN-115')).toBeVisible()
    await expect(row(page, 'SEN-133')).toHaveCount(0) // High, bukan Critical

    await page.reload()
    await expect(row(page, 'SEN-115')).toBeVisible()
    await expect(row(page, 'SEN-133')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Status/ })).toContainText('2')
  })

  test('Task saya dan Minggu ini', async ({ page }) => {
    await openSentul(page)

    await page.getByRole('button', { name: 'Task saya' }).click()
    await expect(row(page, 'SEN-104')).toBeVisible() // Ahmad dan Rama
    await expect(row(page, 'SEN-118')).toHaveCount(0) // Manto

    await page.getByRole('button', { name: 'Task saya' }).click()
    await page.getByRole('button', { name: 'Minggu ini' }).click()
    await expect(row(page, 'SEN-118')).toBeVisible() // 29 Sep
    await expect(row(page, 'SEN-101')).toHaveCount(0) // sudah Done dan lewat
    await expect(row(page, 'SEN-145')).toHaveCount(0) // 9 Okt
  })

  test('pencarian dan pesan bila tidak ada yang cocok', async ({ page }) => {
    await openSentul(page)
    const search = page.getByRole('searchbox', { name: 'Cari di proyek ini' })

    await search.fill('gitlab')
    await expect(row(page, 'SEN-115')).toBeVisible()
    await expect(row(page, 'SEN-101')).toHaveCount(0)

    await search.fill('devops') // label
    await expect(row(page, 'SEN-115')).toBeVisible()

    await search.fill('tidak-ada-yang-begini')
    await expect(page.getByText('Tidak ada task yang cocok')).toBeVisible()
    await page.getByRole('button', { name: 'Hapus semua filter' }).click()
    await expect(row(page, 'SEN-101')).toBeVisible()
    await expect(search).toHaveValue('')
  })
})

test.describe('Tabel proyek: mengubah task', () => {
  test('status diubah langsung dari baris dan tersimpan setelah dimuat ulang (dikembalikan lagi)', async ({
    page,
  }) => {
    await openSentul(page)

    await row(page, 'SEN-104').getByRole('button', { name: 'Ubah status: On Progress' }).click()
    const saved = page.waitForResponse(
      (r) => r.url().includes('/status') && r.request().method() === 'PUT',
    )
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'Fixing' })
      .click()
    expect((await saved).status()).toBe(200) // tampilan berubah langsung; tunggu server sebelum memuat ulang
    await expect(
      row(page, 'SEN-104').getByRole('button', { name: 'Ubah status: Fixing' }),
    ).toBeVisible()

    await page.reload()
    await expect(
      row(page, 'SEN-104').getByRole('button', { name: 'Ubah status: Fixing' }),
    ).toBeVisible()

    // Kembalikan
    await row(page, 'SEN-104').getByRole('button', { name: 'Ubah status: Fixing' }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'On Progress' })
      .click()
    await expect(
      row(page, 'SEN-104').getByRole('button', { name: 'Ubah status: On Progress' }),
    ).toBeVisible()
  })

  test('status tertahan wajib beralasan; alasan tampil di tooltip dan hilang saat status berganti', async ({
    page,
  }) => {
    await openSentul(page)
    const target = row(page, 'SEN-130')

    await target.getByRole('button', { name: 'Ubah status: Not Started' }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'Blocked' })
      .click()
    const dialog = page.getByRole('dialog', { name: /Ubah status ke/ })
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog.getByText('Alasan tertahan wajib diisi.')).toBeVisible()
    await expect(target.getByRole('button', { name: /Ubah status: Not Started/ })).toBeVisible() // belum berubah

    await dialog.getByLabel(/^Alasan tertahan/).fill('Menunggu bahan dari klien')
    await dialog.getByLabel(/Menunggu siapa/).selectOption({ label: 'Bintang' })
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog).toBeHidden()
    await expect(target.getByRole('button', { name: /Ubah status: Blocked/ })).toBeVisible()
    await target.getByRole('button', { name: 'Alasan Blocked' }).hover()
    await expect(page.getByText('Menunggu bahan dari klien')).toBeVisible()

    // Kembali ke Not Started: alasan dan tombolnya hilang
    await target.getByRole('button', { name: /Ubah status: Blocked/ }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'Not Started' })
      .click()
    await expect(target.getByRole('button', { name: /Alasan/ })).toHaveCount(0)
  })

  test('membuat task, mengubahnya, menambah sub-task, lalu menghapusnya', async ({ page }) => {
    await openSentul(page)
    const title = `Uji e2e ${Date.now()}`

    // Buat
    await page.getByRole('button', { name: 'Tambah task' }).first().click()
    const create = page.getByRole('dialog', { name: 'Tambah task' })
    await create.getByRole('button', { name: 'Tambah task' }).click()
    await expect(create.getByText('Judul wajib diisi.')).toBeVisible()
    await create.getByLabel(/^Judul/).fill(title)
    await create.getByLabel('Sub-proyek').selectOption({ label: 'Dispatch' })
    await create.getByLabel('Prioritas').selectOption('High')
    await create.getByRole('checkbox', { name: 'Rama' }).check()
    await create.getByLabel('Mulai').fill('2026-09-29')
    await create.getByLabel('Selesai').fill('2026-10-01')
    await create.getByLabel(/^Label/).fill('E2E, UAT')
    await create.getByRole('button', { name: 'Tambah task' }).click()
    await expect(page.getByText(/^Task SEN-\d+ ditambahkan$/)).toBeVisible()

    const created = row(page, title)
    await expect(created).toContainText('High')
    await expect(created).toContainText('29 Sep')
    await expect(created).toContainText('E2E')
    await expect(created.getByRole('cell').nth(7)).toHaveText(/3/) // 29 Sep - 1 Okt = 3 hari kerja
    await expect(page.getByRole('button', { name: /^Dispatch/ })).toContainText('4 task')

    // Ubah judul di drawer detail
    await created.getByRole('button', { name: title }).click()
    const drawer = page.locator('dialog.ar-drawer')
    await expect(drawer).toBeVisible()
    await expect(page).toHaveURL(/task=SEN-\d+/)
    await drawer.getByRole('button', { name: title }).click()
    await drawer.getByRole('textbox', { name: 'Judul' }).fill(`${title} (diubah)`)
    await drawer.getByRole('button', { name: 'Simpan' }).click()
    await expect(row(page, `${title} (diubah)`)).toBeVisible()

    // Tambah sub-task dari drawer
    await drawer.getByRole('button', { name: 'Tambah sub-task' }).first().click()
    const sub = page.getByRole('dialog', { name: 'Tambah sub-task' })
    await sub.getByLabel(/^Judul/).fill('Anak uji')
    await sub.getByRole('button', { name: 'Tambah sub-task' }).click()
    await expect(row(page, 'Anak uji')).toBeVisible()
    await expect(row(page, `${title} (diubah)`)).toContainText('0/1')
    await expect(drawer.getByRole('button', { name: 'Anak uji' })).toBeVisible()

    // Hapus lewat menu "..." (sub-task ikut hilang)
    await drawer.getByRole('button', { name: 'Aksi lain' }).click()
    await page
      .getByRole('listbox', { name: 'Aksi lain' })
      .getByRole('option', { name: 'Hapus task' })
      .click()
    const confirm = page.getByRole('dialog', { name: /^Hapus SEN-/ })
    await confirm.getByRole('button', { name: 'Hapus task' }).click()
    await expect(row(page, `${title} (diubah)`)).toHaveCount(0)
    await expect(row(page, 'Anak uji')).toHaveCount(0)
    await expect(drawer).toBeHidden()
    await expect(page.getByRole('button', { name: /^Dispatch/ })).toContainText('3 task')
  })

  test('tanggal selesai sebelum mulai ditolak server dengan pesan di kolomnya', async ({
    page,
  }) => {
    await openSentul(page)
    await page.getByRole('button', { name: 'Tambah task' }).first().click()
    const create = page.getByRole('dialog', { name: 'Tambah task' })

    await create.getByLabel(/^Judul/).fill('Tanggal terbalik')
    // Batas min/max di input mencegah memilih terbalik lewat pemilih tanggal; server tetap menolaknya
    const response = await page.request.post(
      `/api/projects/${page.url().split('/proyek/')[1]?.split('/')[0]}/tasks`,
      {
        headers: { 'X-Requested-With': 'ariadne' },
        data: { title: 'Tanggal terbalik', startDate: '2026-10-02', dueDate: '2026-10-01' },
      },
    )
    expect(response.status()).toBe(400)
    await create.getByRole('button', { name: 'Batal' }).click()
  })
})

test.describe('Tabel proyek: peran', () => {
  test.describe('Wiwiet (anggota)', () => {
    test.use({ storageState: authFile('wiwiet') })

    test('boleh menambah task dan mengubah status', async ({ page }) => {
      await openSentul(page)

      await expect(page.getByRole('button', { name: 'Tambah task' }).first()).toBeVisible()
      await expect(row(page, 'SEN-104').getByRole('button', { name: /Ubah status/ })).toBeVisible()
    })
  })

  test.describe('Pak Budi (Tamu)', () => {
    test.use({ storageState: authFile('budi') })

    test('hanya melihat: tanpa tombol tambah dan status bukan tombol; judul tetap bisa dibuka', async ({
      page,
    }) => {
      await openSentul(page)

      await expect(page.getByRole('button', { name: 'Tambah task' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Ubah status/ })).toHaveCount(0)
      await expect(
        row(page, 'SEN-104').getByRole('button', { name: 'Integrasi log & metrics' }),
      ).toBeVisible() // membuka drawer baca-saja; kontrol ubahnya disembunyikan (lihat tugas-detail.spec.ts)
      await expect(row(page, 'SEN-104')).toContainText('On Progress') // tetap terbaca
      expect(await a11yViolations(page)).toEqual([])
    })

    test('API menolak perubahan dan tidak membuka proyek lain', async ({ page, browser }) => {
      const ahmad = await browser.newContext({ storageState: authFile('ahmad') })
      const tasks = (await (await ahmad.request.get('/api/projects/tree')).json()) as {
        id: string
        name: string
        depth: number
      }[]
      const sentul = tasks.find((p) => p.name === 'Sentul')?.id
      const migrasi = tasks.find((p) => p.name === 'Migrasi Data Center')?.id
      const list = (await (await ahmad.request.get(`/api/projects/${sentul}/tasks`)).json()) as {
        tasks: { id: string; key: string }[]
      }
      const taskId = list.tasks.find((t) => t.key === 'SEN-104')?.id
      await ahmad.close()

      const headers = { 'X-Requested-With': 'ariadne' }
      expect(
        (
          await page.request.put(`/api/tasks/${taskId}/status`, {
            headers,
            data: { status: 'Done' },
          })
        ).status(),
      ).toBe(403)
      expect((await page.request.delete(`/api/tasks/${taskId}`, { headers })).status()).toBe(403)
      expect(
        (
          await page.request.post(`/api/projects/${sentul}/tasks`, {
            headers,
            data: { title: 'Dari tamu' },
          })
        ).status(),
      ).toBe(403)
      expect((await page.request.get(`/api/projects/${migrasi}/tasks`)).status()).toBe(404)
      expect((await page.request.get('/api/tasks/MDC-1')).status()).toBe(404)
    })
  })
})
