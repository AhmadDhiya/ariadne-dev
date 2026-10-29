import { expect, test, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Ahmad: Admin sekaligus Supervisor Tim Sentul dan Tim QA
test.use({ storageState: authFile('ahmad') })

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Navigasi utama' })

test.describe('Ahmad (admin dan supervisor): sidebar dan navigasi', () => {
  test('dashboard sementara, topbar menyebut peran, dan semua menu terlihat', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Halo, Ahmad' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu akun Ahmad' })).toContainText(
      'Supervisor · Tim Sentul',
    )
    for (const name of ['Dashboard', 'Timeline Tim', 'Tim', 'Pengaturan']) {
      await expect(sidebar(page).getByRole('link', { name, exact: true })).toBeVisible()
    }
    await expect(sidebar(page).getByRole('link', { name: 'Migrasi Data Center' })).toBeVisible()
  })

  test('pohon proyek bertingkat: buka-tutup dengan keyboard dan jejak halaman', async ({
    page,
  }) => {
    await page.goto('/')
    const nav = sidebar(page)
    await expect(nav.getByRole('link', { name: 'Dispatch' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Temuan UAT & API' })).toHaveCount(0) // SLMS masih tertutup

    await nav.getByRole('button', { name: 'Buka SLMS' }).focus()
    await page.keyboard.press('Enter')
    await expect(nav.getByRole('link', { name: 'Temuan UAT & API' })).toBeVisible()

    await nav.getByRole('link', { name: 'Temuan UAT & API' }).click()
    await expect(page).toHaveURL(/\/proyek\/[0-9a-f-]+\/tabel$/)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(
      /Proyek\s*\/\s*Sentul\s*\/\s*SLMS\s*\/\s*Temuan UAT & API/,
    )
    await expect(page.getByRole('heading', { level: 1, name: 'Temuan UAT & API' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Temuan UAT & API' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await nav.getByRole('button', { name: 'Tutup Sentul' }).click()
    await expect(nav.getByRole('link', { name: 'Dispatch' })).toHaveCount(0)
  })

  test('tab proyek: Tabel berisi task, Gantt dan Milestone masih placeholder, Anggota berfungsi', async ({
    page,
  }) => {
    await page.goto('/')
    await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await page.getByRole('tab', { name: 'Gantt' }).click()
    await expect(page.getByText('Gantt segera hadir')).toBeVisible()
    await page.getByRole('tab', { name: 'Milestone' }).click()
    await expect(page.getByText('Milestone segera hadir')).toBeVisible()
    await page.getByRole('tab', { name: 'Anggota' }).click()
    await expect(page).toHaveURL(/\/anggota$/)
  })

  test('alamat yang tidak ada menampilkan halaman tidak ditemukan di dalam kerangka', async ({
    page,
  }) => {
    await page.goto('/tidak/ada')
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()
    await expect(sidebar(page)).toBeVisible()
    await page.goto('/proyek/00000000-0000-0000-0000-000000000000/anggota')
    await expect(page.getByText('Halaman tidak ditemukan')).toBeVisible()
  })
})

test.describe('Ahmad: halaman Tim', () => {
  test('tiga tim dari mockup dengan jumlah dan supervisornya', async ({ page }) => {
    await page.goto('/tim')
    const list = page.getByRole('navigation', { name: 'Daftar tim' })
    await expect(list.getByRole('link')).toHaveCount(3)
    await expect(list.getByRole('link').nth(0)).toContainText('Tim Sentul')
    await expect(list.getByRole('link').nth(0)).toContainText('7 orang')
    await expect(list.getByRole('link').nth(1)).toContainText('Tim Infrastruktur')
    await expect(list.getByRole('link').nth(1)).toContainText('Supervisor: Syaikhan')
    await expect(list.getByRole('link').nth(2)).toContainText('Tim QA')
    await expect(list.getByRole('link').nth(0)).toHaveAttribute('aria-current', 'page')

    const table = page.getByRole('table', { name: 'Anggota Tim Sentul' })
    await expect(table.getByRole('row')).toHaveCount(8) // header + 7 anggota
    await expect(table.getByRole('row').nth(1)).toContainText('Ahmad')
    await expect(page.getByText('Proyek: Sentul, Migrasi Data Center')).toBeVisible()
  })

  test('menambah dan mengeluarkan anggota (hasil akhirnya tidak mengubah data)', async ({
    page,
  }) => {
    await page.goto('/tim')
    await page.getByRole('link', { name: /Tim QA/ }).click()
    const table = page.getByRole('table', { name: 'Anggota Tim QA' })
    await expect(table.getByRole('row')).toHaveCount(4) // header + Ahmad, Rama, Bintang

    // Cari lewat keyboard: ketik, panah bawah, Enter
    const box = page.getByRole('combobox', { name: 'Tambah anggota' })
    await box.fill('Khal')
    await expect(page.getByRole('option', { name: /Khalil/ })).toBeVisible()
    await expect(box).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Enter')
    await expect(box).toHaveValue('Khalil')
    await page.getByRole('button', { name: 'Tambahkan' }).click()

    await expect(page.getByText('Khalil ditambahkan ke Tim QA')).toBeVisible()
    await expect(table.getByRole('row')).toHaveCount(5)

    // Orang yang sudah anggota tidak lagi muncul sebagai calon
    await box.fill('Khal')
    await expect(page.getByText('Tidak ada orang yang cocok.')).toBeVisible()
    await box.fill('')

    // Keluarkan lagi, dengan konfirmasi
    await page.getByRole('button', { name: 'Keluarkan Khalil dari Tim QA' }).click()
    const dialog = page.getByRole('dialog', { name: 'Keluarkan Khalil dari Tim QA?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Keluarkan' }).click()
    await expect(page.getByText('Khalil dikeluarkan dari tim')).toBeVisible()
    await expect(table.getByRole('row')).toHaveCount(4)
  })

  test('pencarian tidak menampilkan Tamu klien sebagai calon anggota tim', async ({ page }) => {
    await page.goto('/tim')
    await page.getByRole('combobox', { name: 'Tambah anggota' }).fill('Budi')
    await expect(page.getByText('Tidak ada orang yang cocok.')).toBeVisible()
  })

  test('Buat tim: nama wajib diisi dan tidak boleh kembar', async ({ page }) => {
    await page.goto('/tim')
    await page.getByRole('button', { name: 'Buat tim' }).click()
    const dialog = page.getByRole('dialog', { name: 'Buat tim' })
    await dialog.getByRole('button', { name: 'Buat tim' }).click()
    await expect(dialog.getByText('Nama tim wajib diisi.')).toBeVisible()

    await dialog.getByLabel('Nama tim').fill('Tim Sentul')
    await dialog.getByRole('button', { name: 'Buat tim' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Nama tim sudah dipakai.')
    await dialog.getByRole('button', { name: 'Batal' }).click()
    await expect(dialog).toBeHidden()
  })
})

test.describe('Ahmad: anggota proyek', () => {
  test('tabel anggota Sentul seperti mockup 08, dengan email dan tanggal', async ({ page }) => {
    await page.goto('/')
    await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
    await page.getByRole('tab', { name: 'Anggota' }).click()

    await expect(page.getByText('2 Pengelola · 6 Anggota · 1 Tamu')).toBeVisible()
    const table = page.getByRole('table', { name: 'Anggota Sentul' })
    await expect(table.getByRole('row')).toHaveCount(10) // header + 9
    await expect(table.getByRole('row').nth(1)).toContainText('Ahmad')
    await expect(table.getByRole('row').nth(1)).toContainText('ahmad@perusahaan.co.id')
    await expect(table.getByRole('row').nth(3)).toContainText('Wiwiet')
    await expect(table.getByRole('row').nth(3)).toContainText('2 Jun 2026')
    await expect(table.getByRole('row').nth(9)).toContainText('Pak Budi')
    await expect(page.getByRole('combobox', { name: 'Peran Pak Budi' })).toHaveValue('Tamu')
    await expect(page).toHaveScreenshot('anggota-proyek.png')
  })

  test('dari sub-proyek mana pun, anggotanya adalah anggota proyek induk', async ({ page }) => {
    await page.goto('/')
    await sidebar(page).getByRole('button', { name: 'Buka SLMS' }).click()
    await sidebar(page).getByRole('link', { name: 'Temuan UAT & API' }).click()
    await page.getByRole('tab', { name: 'Anggota' }).click()

    await expect(page.getByRole('table', { name: 'Anggota Sentul' }).getByRole('row')).toHaveCount(
      10,
    )
  })

  test('tambah sub-proyek: tersedia di level 1-2, tidak di level terdalam (hasil akhir diarsipkan)', async ({
    page,
  }) => {
    await page.goto('/')
    await sidebar(page).getByRole('link', { name: 'Dispatch' }).click()
    await page.getByRole('button', { name: 'Tambah sub-proyek' }).click()
    const dialog = page.getByRole('dialog', { name: 'Tambah sub-proyek di Dispatch' })
    const name = `Uji E2E ${Date.now()}`
    await dialog.getByLabel('Nama sub-proyek').fill(name)
    await dialog.getByRole('button', { name: 'Tambah sub-proyek' }).click()

    // Sub-proyek baru terbuka; ini level 3 (terdalam), jadi tombol tambah hilang
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tambah sub-proyek' })).toHaveCount(0)

    // Bersihkan lewat API (arsip), supaya data contoh tetap seperti mockup
    const id = /\/proyek\/([0-9a-f-]+)\//.exec(page.url())?.[1]
    expect(id).toBeTruthy()
    const archived = await page.request.post(`/api/projects/${id}/archive`, {
      headers: { 'X-Requested-With': 'ariadne' },
    })
    expect(archived.status()).toBe(204)
  })
})

test.describe('Ahmad: Pengaturan', () => {
  test('daftar pengguna lengkap dengan status; aksi pada diri sendiri tidak ada', async ({
    page,
  }) => {
    await page.goto('/pengaturan')
    const table = page.getByRole('table', { name: 'Semua pengguna' })
    await expect(table.getByRole('row')).toHaveCount(10) // header + 9
    const ahmad = table.getByRole('row').filter({ hasText: 'ahmad@perusahaan.co.id' })
    await expect(ahmad).toContainText('Admin')
    await expect(ahmad.getByRole('button')).toHaveCount(0)
    const budi = table.getByRole('row').filter({ hasText: 'budi@klien.example' })
    await expect(budi).toContainText('Tamu')
    await expect(budi.getByRole('button', { name: 'Jadikan admin' })).toHaveCount(0) // Tamu tidak jadi admin
    await expect(page).toHaveScreenshot('pengaturan-pengguna.png')
  })

  test('Tambah pengguna: isian wajib diperiksa sebelum dikirim', async ({ page }) => {
    await page.goto('/pengaturan')
    await page.getByRole('button', { name: 'Tambah pengguna' }).click()
    const dialog = page.getByRole('dialog', { name: 'Tambah pengguna' })
    await dialog.getByRole('button', { name: 'Tambah pengguna' }).click()
    await expect(dialog.getByText('Email wajib diisi.')).toBeVisible()
    await expect(dialog.getByText('Nama wajib diisi.')).toBeVisible()

    // Email yang sudah terdaftar ditolak server dengan pesan di kolomnya
    await dialog.getByLabel('Email').fill('rama@perusahaan.co.id')
    await dialog.getByLabel(/^Nama/).fill('Rama Kembar')
    await dialog.getByRole('button', { name: 'Tambah pengguna' }).click()
    await expect(dialog.getByText('Email ini sudah terdaftar.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Batal' }).click()
  })

  test('tab Proyek menampilkan pohon proyek dengan kodenya', async ({ page }) => {
    await page.goto('/pengaturan?tab=proyek')
    const table = page.getByRole('table', { name: 'Semua proyek' })
    await expect(table.getByRole('row')).toHaveCount(10) // header + 2 proyek + 7 sub-proyek
    await expect(table.getByRole('row').nth(1)).toContainText('SEN')
    await expect(table.getByRole('row').filter({ hasText: 'Temuan UAT & API' })).toContainText(
      'Sub-sub-proyek',
    )
    await expect(table.getByRole('row').filter({ hasText: 'Migrasi Data Center' })).toContainText(
      'MDC',
    )
  })

  test('ubah nama dan arsipkan proyek lewat tampilan (proyek sementara, data contoh tidak berubah)', async ({
    page,
  }) => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    const created = await page.request.post('/api/projects', {
      headers: { 'X-Requested-With': 'ariadne' },
      data: { name: `Proyek Uji ${suffix}`, code: `U${suffix}` },
    })
    expect(created.status()).toBe(201)

    await page.goto('/pengaturan?tab=proyek')
    const table = page.getByRole('table', { name: 'Semua proyek' })
    await expect(table.getByRole('row').filter({ hasText: `Proyek Uji ${suffix}` })).toBeVisible()

    // Ubah nama: isian awal berisi nama lama, kosong ditolak, nama baru tampil
    await page.getByRole('button', { name: `Ubah nama Proyek Uji ${suffix}` }).click()
    const rename = page.getByRole('dialog', { name: `Ubah nama Proyek Uji ${suffix}` })
    await expect(rename.getByLabel(/^Nama proyek/)).toHaveValue(`Proyek Uji ${suffix}`)
    await rename.getByLabel(/^Nama proyek/).fill('')
    await rename.getByRole('button', { name: 'Simpan' }).click()
    await expect(rename.getByText('Nama proyek wajib diisi.')).toBeVisible()
    await rename.getByLabel(/^Nama proyek/).fill(`Uji Ganti ${suffix}`)
    await rename.getByRole('button', { name: 'Simpan' }).click()
    await expect(page.getByText(`Proyek diubah menjadi Uji Ganti ${suffix}`)).toBeVisible()
    const row = table.getByRole('row').filter({ hasText: `Uji Ganti ${suffix}` })
    await expect(row).toContainText(`U${suffix}`) // kode tidak berubah

    // Arsipkan: ada konfirmasi, Batal tidak mengubah apa pun
    await page.getByRole('button', { name: `Arsipkan Uji Ganti ${suffix}` }).click()
    const archive = page.getByRole('dialog', { name: `Arsipkan Uji Ganti ${suffix}?` })
    await archive.getByRole('button', { name: 'Batal' }).click()
    await expect(row).toBeVisible()

    await page.getByRole('button', { name: `Arsipkan Uji Ganti ${suffix}` }).click()
    await page
      .getByRole('dialog', { name: `Arsipkan Uji Ganti ${suffix}?` })
      .getByRole('button', { name: 'Arsipkan' })
      .click()
    await expect(page.getByText(`Uji Ganti ${suffix} diarsipkan`)).toBeVisible()
    await expect(row).toHaveCount(0)
    await expect(table.getByRole('row')).toHaveCount(10) // kembali seperti data contoh
  })

  test('Buat proyek: kode divalidasi server dan tidak boleh kembar', async ({ page }) => {
    await page.goto('/pengaturan?tab=proyek')
    await page.getByRole('button', { name: 'Buat proyek' }).click()
    const dialog = page.getByRole('dialog', { name: 'Buat proyek' })
    await dialog.getByLabel('Nama proyek').fill('Uji Kode')
    await dialog.getByLabel('Kode').fill('1salah')
    await dialog.getByRole('button', { name: 'Buat proyek' }).click()
    await expect(dialog.getByText(/Kode proyek 2–6 karakter/)).toBeVisible()

    await dialog.getByLabel('Kode').fill('sen')
    await dialog.getByRole('button', { name: 'Buat proyek' }).click()
    await expect(dialog.getByText('Kode proyek sudah dipakai.')).toBeVisible()
  })
})

test.describe('Ahmad: tema dan aksesibilitas', () => {
  for (const [path, label] of [
    ['/', 'dashboard'],
    ['/tim', 'tim'],
    ['/pengaturan', 'pengaturan'],
  ] as const) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${label} lolos axe di tema ${theme === 'light' ? 'terang' : 'gelap'}`, async ({
        page,
      }) => {
        await preferTheme(page, theme)
        await page.goto(path)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(sidebar(page)).toBeVisible()
        expect(await a11yViolations(page)).toEqual([])
      })
    }
  }

  test('halaman anggota proyek lolos axe di kedua tema', async ({ page }) => {
    await page.goto('/')
    await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
    await page.getByRole('tab', { name: 'Anggota' }).click()
    await expect(page.getByRole('table', { name: 'Anggota Sentul' })).toBeVisible()
    expect(await a11yViolations(page)).toEqual([])
    await preferTheme(page, 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await a11yViolations(page)).toEqual([])
  })

  test('memilih tema lewat menu akun tersimpan di akun, bukan hanya di browser ini', async ({
    page,
    browser,
  }) => {
    await page.goto('/')
    try {
      await page.getByRole('button', { name: 'Menu akun Ahmad' }).click()
      await page.getByRole('option', { name: 'Tema gelap' }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

      // Browser lain (tanpa localStorage) yang login sebagai akun yang sama mendapat tema gelap
      await expect
        .poll(async () => (await (await page.request.get('/api/auth/me')).json()).theme)
        .toBe('dark')
      const fresh = await browser.newContext({
        storageState: authFile('ahmad'),
        colorScheme: 'light',
      })
      const other = await fresh.newPage()
      await other.goto('/')
      await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark')
      await fresh.close()
    } finally {
      // Kembalikan ke "ikuti sistem" (keadaan awal) supaya test lain tidak terpengaruh
      const reset = await page.request.patch('/api/me', {
        data: { theme: 'system' },
        headers: { 'X-Requested-With': 'ariadne' },
      })
      expect(reset.ok()).toBe(true)
    }
  })
})
