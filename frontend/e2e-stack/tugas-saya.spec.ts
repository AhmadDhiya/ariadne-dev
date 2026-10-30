import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Dashboard pribadi (Fase 5). Data contoh Ahmad; "hari ini" dikunci ke Senin 28 September 2026.
// Berkas ini berurutan SETELAH tugas-detail.spec.ts; tes yang menambah data memakai task buatan sendiri yang dihapus lagi.
test.use({ storageState: authFile('ahmad') })

const HEADERS = { 'X-Requested-With': 'ariadne' }
const row = (page: Page, key: string) => page.locator('.ar-todayrow').filter({ hasText: key })
const cards = (page: Page) => page.getByRole('group', { name: 'Ringkasan task saya' })
const group = (page: Page, name: string) => page.getByRole('group', { name })
const searchBox = (page: Page) => page.getByRole('combobox', { name: /Cari task, proyek, orang/ })

async function openDashboard(page: Page, { withTasks = true } = {}) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /^Selamat/ })).toBeVisible()
  if (withTasks) await expect(group(page, 'Terlambat')).toBeVisible()
}

async function myId(request: APIRequestContext): Promise<string> {
  return ((await (await request.get('/api/auth/me')).json()) as { id: string }).id
}

async function sentulId(request: APIRequestContext): Promise<string> {
  const tree = (await (await request.get('/api/projects/tree')).json()) as {
    id: string
    name: string
  }[]
  const found = tree.find((p) => p.name === 'Sentul')
  if (!found) throw new Error('Proyek Sentul tidak ada (data contoh belum dibuat?)')
  return found.id
}

/** Task milik Ahmad, berjalan hari ini (28 Sep s.d. 30 Sep), supaya muncul di "Sedang berjalan". */
async function createMine(request: APIRequestContext, title: string) {
  const response = await request.post(`/api/projects/${await sentulId(request)}/tasks`, {
    headers: HEADERS,
    data: {
      title,
      status: 'OnProgress',
      priority: 'Low',
      startDate: '2026-09-28',
      dueDate: '2026-09-30',
      assigneeIds: [await myId(request)],
    },
  })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: string; key: string }
}

const remove = async (request: APIRequestContext, id: string) =>
  expect((await request.delete(`/api/tasks/${id}`, { headers: HEADERS })).status()).toBe(204)

test.describe('Dashboard: tampilan sesuai mockup 02 (data contoh)', () => {
  test('sapaan, tanggal, empat kartu, daftar Hari Ini, dan Perlu perhatian', async ({ page }) => {
    await openDashboard(page)

    await expect(page.getByText('Senin, 28 September 2026')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^Selamat (pagi|siang|sore|malam), Ahmad$/,
    )

    // Kartu: angka dan petunjuknya
    const summary = cards(page)
    await expect(summary.getByRole('button', { name: /^Terlambat/ })).toContainText('3')
    await expect(summary.getByRole('button', { name: /^Terlambat/ })).toContainText(
      '1 Critical · 2 High',
    )
    await expect(summary.getByRole('button', { name: /^Jatuh tempo minggu ini/ })).toContainText(
      '6',
    )
    await expect(summary.getByRole('button', { name: /^Jatuh tempo minggu ini/ })).toContainText(
      's.d. Jumat, 2 Okt',
    )
    await expect(summary.getByRole('button', { name: /^Sedang dikerjakan/ })).toContainText(
      'di 2 proyek',
    )
    await expect(summary.getByRole('button', { name: /^Tertahan/ })).toContainText('2')
    await expect(summary.getByRole('button', { name: /^Tertahan/ })).toContainText(
      'Blocked 1 · On Request 1',
    )

    // Hari Ini: tiga kelompok, urut prioritas, sama seperti mockup
    const keys = async (name: string) =>
      group(page, name).locator('.ar-todayrow .ar-id').allTextContents()
    expect(await keys('Terlambat')).toEqual(['SEN-115', 'SEN-121', 'SEN-122'])
    expect(await keys('Jatuh tempo hari ini')).toEqual(['SEN-112', 'MDC-18'])
    expect(await keys('Sedang berjalan')).toEqual(['MDC-21', 'SEN-133', 'SEN-104'])
    await expect(row(page, 'SEN-115')).toContainText('Sentul / Dispatch')
    await expect(row(page, 'SEN-115')).toContainText('telat 3 hari')
    await expect(row(page, 'SEN-121')).toContainText('Sentul / SLMS / Temuan UAT & API')
    await expect(row(page, 'SEN-112')).toContainText('Hari ini')
    await expect(row(page, 'MDC-21')).toContainText('30 Sep')
    await expect(row(page, 'SEN-124')).toHaveCount(0) // mulai besok: belum "berjalan"

    // Perlu perhatian
    const attention = page.getByRole('region', { name: 'Perlu perhatian' })
    await expect(attention).toContainText('Syaikhan')
    await expect(attention).toContainText('menyebut Anda di SEN-115')
    await expect(attention).toContainText('08.55')
    await expect(attention).toContainText('menugaskan MDC-24 ke Anda')
    await expect(attention).toContainText('Rencana cut-over · mulai 5 Okt')
    await expect(attention).toContainText('Khalil')
    await expect(attention).toContainText('Kemarin')
    await expect(attention).toContainText('lewat tenggat 3 hari') // SEN-115
  })

  test('Timeline saya: baris per proyek, bar, garis hari ini, dan beban kerja per hari', async ({
    page,
  }) => {
    await openDashboard(page)
    const timeline = page.getByRole('region', { name: 'Timeline saya' })

    await expect(timeline).toContainText('Semua proyek · 21 Sep – 11 Okt')
    // Urutan proyek sama dengan sidebar
    await expect(timeline.locator('.ar-gantt-group')).toHaveText(['Sentul', 'Migrasi Data Center'])
    await expect(timeline.getByRole('button', { name: 'Sentul' })).toBeVisible()
    await expect(timeline.getByRole('button', { name: 'Migrasi Data Center' })).toBeVisible()
    await expect(timeline.getByRole('button', { name: 'Pipeline GitLab IRS' })).toBeVisible()
    await expect(timeline.locator('.ar-bar')).toHaveCount(10) // 7 task Sentul + 3 MDC yang punya tanggal di rentang
    await expect(timeline.locator('.ar-bar.is-overdue')).toHaveCount(3)
    await expect(timeline.locator('.ar-today')).toHaveCount(1)

    const load = await timeline.locator('.ar-gantt-load .ar-heat').allTextContents()
    expect(load).toHaveLength(21)
    expect(load.slice(0, 7)).toEqual(['2', '3', '5', '6', '6', '6', '4']) // 21 s.d. 27 Sep
    expect(load[7]).toBe('5') // Senin 28 Sep
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`lolos axe dan sesuai screenshot acuan, tema ${theme === 'light' ? 'terang' : 'gelap'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1320 }) // setinggi mockup 02
      await preferTheme(page, theme)
      await openDashboard(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('.ar-gantt-right')).toBeVisible()

      expect(await a11yViolations(page)).toEqual([])
      await expect(page.locator('#konten')).toHaveScreenshot(`dashboard-${theme}.png`, {
        mask: [page.getByRole('heading', { level: 1 })], // sapaan bergantung jam sungguhan
      })
    })
  }
})

test.describe('Dashboard: interaksi', () => {
  test('klik kartu menyaring daftar dan tersimpan di alamat; klik lagi membuka saringan', async ({
    page,
  }) => {
    await openDashboard(page)

    await cards(page)
      .getByRole('button', { name: /^Tertahan/ })
      .click()

    await expect(page).toHaveURL(/kartu=tertahan/)
    await expect(cards(page).getByRole('button', { name: /^Tertahan/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(row(page, 'SEN-115')).toBeVisible()
    await expect(row(page, 'SEN-133')).toBeVisible()
    await expect(row(page, 'SEN-104')).toHaveCount(0)
    await expect(cards(page).getByRole('button', { name: /^Terlambat/ })).toContainText('3') // angka kartu tetap

    await page.reload()
    await expect(row(page, 'SEN-133')).toBeVisible()
    await expect(row(page, 'SEN-104')).toHaveCount(0)

    await page.getByRole('button', { name: 'Hapus saringan Tertahan' }).click()
    await expect(page).not.toHaveURL(/kartu=/)
    await expect(row(page, 'SEN-104')).toBeVisible()

    await cards(page)
      .getByRole('button', { name: /^Terlambat/ })
      .click()
    await expect(row(page, 'SEN-121')).toBeVisible()
    await expect(row(page, 'SEN-112')).toHaveCount(0)
    await cards(page)
      .getByRole('button', { name: /^Terlambat/ })
      .click()
    await expect(row(page, 'SEN-112')).toBeVisible()
  })

  test('judul task dan butir Perlu perhatian membuka drawer detail', async ({ page }) => {
    await openDashboard(page)

    await row(page, 'SEN-112').getByRole('button', { name: 'Paket PenTest whitebox' }).click()
    await expect(page).toHaveURL(/task=SEN-112/)
    await expect(page.locator('dialog.ar-drawer')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog.ar-drawer')).toBeHidden()

    await page
      .getByRole('region', { name: 'Perlu perhatian' })
      .getByRole('button', { name: /menugaskan MDC-24/ })
      .click()
    await expect(page).toHaveURL(/task=MDC-24/)
    await expect(
      page.locator('dialog.ar-drawer').getByRole('button', { name: 'Rencana cut-over' }),
    ).toBeVisible()
  })

  test('status diubah dari baris; kartu dan daftar ikut berubah; tertahan wajib beralasan', async ({
    page,
    request,
  }) => {
    const title = `Dashboard uji ${Date.now()}`
    const task = await createMine(request, title)
    await openDashboard(page)
    await expect(cards(page).getByRole('button', { name: /^Sedang dikerjakan/ })).toContainText('7')

    // On Progress -> Not Started: keluar dari kartu "Sedang dikerjakan", tetap di daftar
    await row(page, title).getByRole('button', { name: 'Ubah status: On Progress' }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'Not Started' })
      .click()
    await expect(
      row(page, title).getByRole('button', { name: 'Ubah status: Not Started' }),
    ).toBeVisible()
    await expect(cards(page).getByRole('button', { name: /^Sedang dikerjakan/ })).toContainText('6')

    // Status tertahan: dialog alasan dulu
    await row(page, title).getByRole('button', { name: 'Ubah status: Not Started' }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'On Hold' })
      .click()
    const dialog = page.getByRole('dialog', { name: /Ubah status ke/ })
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog.getByText('Alasan tertahan wajib diisi.')).toBeVisible()
    await dialog.getByLabel(/^Alasan tertahan/).fill('Menunggu jadwal klien')
    await dialog.getByRole('button', { name: 'Simpan status' }).click()
    await expect(dialog).toBeHidden()
    await expect(
      row(page, title).getByRole('button', { name: 'Ubah status: On Hold' }),
    ).toBeVisible()
    await expect(cards(page).getByRole('button', { name: /^Tertahan/ })).toContainText('3')

    await remove(request, task.id)
  })

  test('"Tambah update" dari baris: kolom Update terakhir dan aktivitas terisi', async ({
    page,
    request,
  }) => {
    const title = `Update dari dashboard ${Date.now()}`
    const task = await createMine(request, title)
    await openDashboard(page)

    await row(page, title)
      .getByRole('button', { name: `Tambah update untuk ${task.key}` })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Tambah update' })
    await expect(dialog).toContainText(`${task.key} ${title}`)
    await dialog.getByRole('button', { name: 'Kirim update' }).click()
    await expect(dialog.getByText('Isi update wajib diisi.')).toBeVisible()
    await dialog.getByLabel(/^Update/).fill('Sudah setengah jalan')
    await dialog.getByRole('button', { name: 'Kirim update' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(`Update untuk ${task.key} dikirim`)).toBeVisible()

    await row(page, title).getByRole('button', { name: title }).click()
    await expect(
      page.locator('dialog.ar-drawer').getByRole('region', { name: 'Aktivitas' }),
    ).toContainText('Sudah setengah jalan')
    await page.keyboard.press('Escape')

    await remove(request, task.id)
  })

  test('"Tambah task" memilih proyek dulu, lalu form; task baru tidak otomatis jadi milik saya', async ({
    page,
    request,
  }) => {
    await openDashboard(page)
    const title = `Dari dashboard ${Date.now()}`

    await page.getByRole('button', { name: 'Tambah task' }).click()
    const pick = page.getByRole('dialog', { name: 'Tambah task di proyek mana?' })
    await pick.getByLabel(/^Proyek/).selectOption({ label: 'Sentul' })
    await pick.getByRole('button', { name: 'Lanjut' }).click()
    const form = page.getByRole('dialog', { name: 'Tambah task' })
    await expect(form).toContainText('Di Sentul')
    await form.getByLabel(/^Judul/).fill(title)
    await form.getByLabel('Sub-proyek').selectOption({ label: 'Dispatch' })
    await form.getByRole('button', { name: 'Tambah task' }).click()
    await expect(page.getByText(/^Task SEN-\d+ ditambahkan$/)).toBeVisible()

    const list = (await (
      await request.get(
        `/api/projects/${await sentulId(request)}/tasks?q=${encodeURIComponent(title)}`,
      )
    ).json()) as {
      tasks: { id: string; title: string }[]
    }
    const created = list.tasks.find((t) => t.title === title)
    expect(created).toBeDefined()
    await remove(request, created?.id ?? '')
  })

  test('zoom Minggu dan Bulan mengganti rentang dan judul kolom', async ({ page }) => {
    await openDashboard(page)
    const timeline = page.getByRole('region', { name: 'Timeline saya' })

    await timeline.getByRole('button', { name: 'Minggu' }).click()
    await expect(timeline).toContainText('21 Sep – 29 Nov')
    await expect(timeline.locator('.ar-gantt-col')).toHaveCount(10)
    await expect(timeline.getByText('28 Sep', { exact: true })).toBeVisible()
    await expect(timeline.locator('.ar-today')).toHaveCount(1)

    await timeline.getByRole('button', { name: 'Bulan' }).click()
    await expect(timeline).toContainText('1 Agu – 26 Feb')
    await expect(timeline.getByText('Okt', { exact: true })).toBeVisible()
    await expect(timeline.locator('.ar-gantt-load .ar-heat')).toHaveCount(210)

    await timeline.getByRole('button', { name: 'Hari' }).click()
    await expect(timeline.locator('.ar-gantt-col')).toHaveCount(21)
  })

  test('grup di Timeline saya bisa dilipat', async ({ page }) => {
    await openDashboard(page)
    const timeline = page.getByRole('region', { name: 'Timeline saya' })

    await timeline.getByRole('button', { name: 'Migrasi Data Center' }).click()

    await expect(timeline.getByText('MDC-21')).toHaveCount(0)
    await expect(timeline.locator('.ar-bar')).toHaveCount(7)
  })
})

test.describe('Pencarian global', () => {
  test('"/" memfokuskan; task, proyek, dan orang ditemukan dan bisa dibuka', async ({ page }) => {
    await openDashboard(page)

    await page.keyboard.press('/')
    await expect(searchBox(page)).toBeFocused()
    await page.keyboard.type('gitlab')
    const results = page.getByRole('listbox', { name: 'Hasil pencarian' })
    await expect(results.getByRole('group', { name: 'Task' })).toContainText('SEN-115')
    await expect(results.getByRole('group', { name: 'Task' })).toContainText('Sentul / Dispatch')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/proyek\/[^/]+\/tabel\?task=SEN-115/)
    await expect(
      page.locator('dialog.ar-drawer').getByRole('button', { name: 'Pipeline GitLab IRS' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')

    await searchBox(page).fill('Smartclass')
    await results.getByRole('option', { name: /Smartclassroom/ }).click()
    await expect(page).toHaveURL(/\/proyek\/[^/]+\/tabel$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Smartclassroom' })).toBeVisible()

    await searchBox(page).fill('Rama')
    await expect(results.getByRole('group', { name: 'Orang' })).toContainText('Rama')
    await results.getByRole('option', { name: /Rama/ }).click()
    await expect(page).toHaveURL(/pic=/)
    await expect(page.getByRole('button', { name: /^PIC/ })).toContainText('Rama')
  })

  test('tanpa hasil memberi pesan; Esc menutup lalu mengosongkan', async ({ page }) => {
    await openDashboard(page)

    await searchBox(page).fill('tidak-ada-yang-begini')
    await expect(page.getByRole('status').filter({ hasText: 'Tidak ada hasil' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox', { name: 'Hasil pencarian' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(searchBox(page)).toHaveValue('')
  })

  test.describe('Pak Budi (Tamu)', () => {
    test.use({ storageState: authFile('budi') })

    test('hanya proyeknya; tanpa orang; dashboard kosong tanpa tombol Tambah task', async ({
      page,
    }) => {
      await openDashboard(page, { withTasks: false })
      await expect(page.getByRole('button', { name: 'Tambah task' })).toHaveCount(0)
      await expect(cards(page).getByRole('button', { name: /^Terlambat/ })).toContainText('0')
      await expect(page.getByText('Tidak ada task untuk hari ini')).toBeVisible()
      await expect(page.getByText('Tidak ada yang perlu perhatian saat ini.')).toBeVisible()

      await searchBox(page).fill('Migrasi')
      await expect(page.getByRole('status').filter({ hasText: 'Tidak ada hasil' })).toBeVisible()

      await searchBox(page).fill('Rama')
      await expect(page.getByRole('status').filter({ hasText: 'Tidak ada hasil' })).toBeVisible() // orang tidak dicari Tamu

      await searchBox(page).fill('gitlab')
      await expect(page.getByRole('group', { name: 'Task', exact: true })).toContainText('SEN-115')

      const raw = await (await page.request.get('/api/search?q=Rama')).text()
      expect(raw).not.toContain('@perusahaan.co.id') // tidak ada email di hasil pencarian
    })
  })
})
