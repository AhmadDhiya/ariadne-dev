import { expect, test, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Gantt proyek dan tab Milestone (Fase 6). Data contoh Sentul; "hari ini" dikunci ke Senin 28 September 2026.
// Berkas ini berurutan SETELAH tugas-detail.spec.ts dan SEBELUM tugas-saya.spec.ts; milestone yang ditambah di sini dihapus lagi.
test.use({ storageState: authFile('ahmad') })

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Navigasi utama' })
const chart = (page: Page) => page.getByRole('region', { name: 'Gantt proyek' })

async function openGantt(page: Page) {
  await page.goto('/')
  await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
  await page.getByRole('tab', { name: 'Gantt' }).click()
  await expect(chart(page).locator('.ar-bar').first()).toBeVisible()
}

async function openMilestones(page: Page) {
  await page.goto('/')
  await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
  await page.getByRole('tab', { name: 'Milestone' }).click()
  await expect(page.getByRole('table', { name: 'Milestone proyek' })).toBeVisible()
}

test.describe('Gantt proyek: tampilan sesuai mockup 04 (data contoh)', () => {
  test('grup, bar, label PIC, milestone, garis hari ini, dan beban kerja per orang', async ({
    page,
  }) => {
    await openGantt(page)
    const gantt = chart(page)

    // Grup per sub-proyek, urutan sama dengan tabel
    await expect(gantt.locator('.ar-gantt-group')).toHaveText([
      'Dispatch',
      'SLMS',
      'SLMS / Temuan UAT & API',
      'Smartclassroom',
      'FAQ',
      'Menagih Pihak Lain',
      'Testing Oktober',
    ])
    await expect(gantt.getByRole('button', { name: 'Pipeline GitLab IRS' })).toBeVisible()
    await expect(gantt.locator('.ar-gantt-task.is-sub')).toHaveCount(3) // SEN-122, 123, 124

    // Bar bertanda terlambat (115, 121, 122) dan label PIC di kanan bar
    await expect(gantt.locator('.ar-bar.is-overdue')).toHaveCount(3)
    await expect(gantt.locator('.ar-bar-label').filter({ hasText: 'Ahmad, Wiwiet' })).toHaveCount(1)
    await expect(gantt.locator('.ar-today')).toHaveCount(1)

    // Milestone dari data contoh
    await expect(gantt.getByText('UAT SLMS · 5 Okt')).toBeVisible()
    await expect(gantt.getByText('Go-Live Sentul · 30 Okt')).toBeVisible()

    // Beban kerja per orang: Ahmad 21-25 Sep di Sentul = 115, 112, 133, 121, 122 (+104 dari 28 Sep)
    await expect(gantt.getByText('Beban kerja per orang')).toBeVisible()
    const rows = gantt.locator('.ar-gantt-personrow')
    expect(await rows.count()).toBeGreaterThanOrEqual(6)
    // Teks terakhir di tiap baris adalah nama (sebelumnya ada avatar berisi inisial)
    const names = await gantt
      .locator('.ar-gantt-person')
      .evaluateAll((els) => els.map((el) => el.lastChild?.textContent ?? ''))
    expect(names).toContain('Ahmad')
    expect(names).toContain('Galih')
    expect(names).not.toContain('Pak Budi') // Tamu tidak masuk beban kerja
    const ahmad = names.indexOf('Ahmad')
    const counts = await rows.nth(ahmad).locator('.ar-heat').allTextContents()
    expect(counts.slice(0, 5)).toEqual(['2', '3', '5', '5', '5']) // 21 s.d. 25 Sep
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`lolos axe dan sesuai screenshot acuan, tema ${theme === 'light' ? 'terang' : 'gelap'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1260 }) // setinggi mockup 04
      await preferTheme(page, theme)
      await openGantt(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

      expect(await a11yViolations(page)).toEqual([])
      await expect(page.locator('#konten')).toHaveScreenshot(`gantt-${theme}.png`)
    })
  }
})

test.describe('Gantt proyek: interaksi', () => {
  test('zoom Minggu dan Bulan; digulir ke samping, lalu "Hari ini" membawa kembali', async ({
    page,
  }) => {
    await openGantt(page)
    const gantt = chart(page)
    const scroller = gantt.locator('.ar-gantt-right')

    // Hari: rentang 91 hari (lebih lebar dari layar), jadi bisa digulir; kolom awal 21 Sep
    expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
    await scroller.evaluate((el) => (el.scrollLeft = 600))
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Hari ini' }).click()
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBe(0)

    await page.getByRole('button', { name: 'Minggu' }).click()
    await expect(gantt.locator('.ar-gantt-col')).toHaveCount(26)
    await expect(gantt.getByText('28 Sep – 4 Okt', { exact: true })).toBeVisible()
    await expect(gantt.locator('.ar-bar').first()).toBeVisible()
    await expect(gantt.locator('.ar-gantt-personrow').first().locator('.ar-heat')).toHaveCount(26)
    // Minggu/Bulan: tanpa label PIC di samping bar; nama PIC ada di tooltip bar
    await expect(gantt.locator('.ar-bar-label')).toHaveCount(0)
    await expect(gantt.locator('.ar-bar[title^="SEN-115 "]')).toHaveAttribute(
      'title',
      'SEN-115 Pipeline GitLab IRS · Blocked · terlambat · PIC: Ahmad, Wiwiet',
    )

    await page.getByRole('button', { name: 'Bulan' }).click()
    await expect(gantt.getByText('Okt 2026', { exact: true })).toBeVisible()
    await expect(gantt.locator('.ar-gantt-personrow').first().locator('.ar-heat')).toHaveCount(12)
    await expect(gantt.locator('.ar-bar-label')).toHaveCount(0)
    expect(await scroller.evaluate((el) => el.scrollWidth)).toBeGreaterThan(1800) // 12 bulan x 160 px, tidak dipaksa muat

    await page.getByRole('button', { name: 'Hari', exact: true }).click()
    await expect(gantt.locator('.ar-gantt-col')).toHaveCount(91)
    await expect(gantt.locator('.ar-bar-label').filter({ hasText: 'Ahmad, Wiwiet' })).toHaveCount(1)
  })

  test('filter PIC, Status, dan Terlambat menyaring bar; tersimpan di alamat; beban kerja tidak ikut', async ({
    page,
  }) => {
    await openGantt(page)
    const gantt = chart(page)
    const before = await gantt.locator('.ar-gantt-person').count()

    await page.getByRole('button', { name: 'Terlambat' }).click()
    await expect(page).toHaveURL(/overdue=1/)
    await expect(gantt.locator('.ar-gantt-task')).toHaveCount(3) // SEN-115, 121, 122
    await expect(gantt.locator('.ar-gantt-group').first()).toHaveText('Dispatch')
    expect(await gantt.locator('.ar-gantt-person').count()).toBe(before)

    await page.reload()
    await expect(gantt.locator('.ar-gantt-task')).toHaveCount(3)
    await page.getByRole('button', { name: 'Terlambat' }).click()
    await expect(page).not.toHaveURL(/overdue=/)

    await page.getByRole('button', { name: 'Status', exact: true }).click()
    await page
      .getByRole('listbox', { name: 'Filter status' })
      .getByRole('option', { name: 'Blocked' })
      .click()
    await page.keyboard.press('Escape')
    await expect(gantt.locator('.ar-gantt-task')).toHaveCount(1)
    await expect(gantt.getByRole('button', { name: 'Pipeline GitLab IRS' })).toBeVisible()
  })

  test('klik judul task membuka drawer detail', async ({ page }) => {
    await openGantt(page)

    await chart(page).getByRole('button', { name: 'Paket PenTest whitebox' }).click()

    await expect(page).toHaveURL(/task=SEN-112/)
    await expect(page.locator('dialog.ar-drawer')).toBeVisible()
  })

  test('grup bisa dilipat', async ({ page }) => {
    await openGantt(page)
    const gantt = chart(page)

    await gantt.getByRole('button', { name: 'Dispatch' }).click()

    await expect(gantt.getByText('SEN-115')).toHaveCount(0)
    await expect(gantt.getByRole('button', { name: 'Dispatch' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})

test.describe('Tab Milestone', () => {
  test('daftar milestone data contoh urut tanggal, dengan sub-proyeknya', async ({ page }) => {
    await openMilestones(page)

    const table = page.getByRole('table', { name: 'Milestone proyek' })
    await expect(table.getByRole('row')).toHaveCount(3) // judul + UAT SLMS + Go-Live Sentul
    await expect(table.getByRole('row').nth(1)).toContainText('UAT SLMS')
    await expect(table.getByRole('row').nth(1)).toContainText('SLMS')
    await expect(table.getByRole('row').nth(1)).toContainText('5 Okt')
    await expect(table.getByRole('row').nth(2)).toContainText('Go-Live Sentul')
    expect(await a11yViolations(page)).toEqual([])
  })

  test('menambah, mengubah, menandai selesai, dan menghapus milestone (tampil juga di Gantt)', async ({
    page,
  }) => {
    await openMilestones(page)
    const name = `Uji milestone ${Date.now()}`
    const table = page.getByRole('table', { name: 'Milestone proyek' })

    // Tambah: nama dan tanggal wajib
    await page.getByRole('button', { name: 'Tambah milestone' }).click()
    const form = page.getByRole('dialog', { name: 'Tambah milestone' })
    await form.getByRole('button', { name: 'Tambah milestone' }).click()
    await expect(form.getByText('Nama wajib diisi.')).toBeVisible()
    await expect(form.getByText('Tanggal wajib diisi.')).toBeVisible()
    await form.getByLabel(/^Nama/).fill(name)
    await form.getByLabel(/^Tanggal/).fill('2026-10-12')
    await form.getByLabel('Sub-proyek').selectOption({ label: 'Dispatch' })
    await form.getByRole('button', { name: 'Tambah milestone' }).click()
    await expect(page.getByText(`Milestone ${name} ditambahkan`)).toBeVisible()
    const row = table.getByRole('row').filter({ hasText: name })
    await expect(row).toContainText('Dispatch')
    await expect(row).toContainText('12 Okt')

    // Tampil di Gantt pada baris Dispatch
    await page.getByRole('tab', { name: 'Gantt' }).click()
    await expect(chart(page).getByText(`${name} · 12 Okt`)).toBeVisible()
    await page.getByRole('tab', { name: 'Milestone' }).click()

    // Ubah nama dan tandai selesai
    await row.getByRole('button', { name: `Ubah ${name}` }).click()
    const edit = page.getByRole('dialog', { name: 'Ubah milestone' })
    await edit.getByLabel(/^Nama/).fill(`${name} (v2)`)
    await edit.getByLabel('Sudah selesai').check()
    await edit.getByRole('button', { name: 'Simpan' }).click()
    const renamed = table.getByRole('row').filter({ hasText: `${name} (v2)` })
    await expect(
      renamed.getByRole('checkbox', { name: `Tandai ${name} (v2) selesai` }),
    ).toBeChecked()

    // Kotak ini mengikuti data dari server, jadi berubah sesudah jawaban datang (bukan seketika)
    await renamed.getByRole('checkbox', { name: `Tandai ${name} (v2) selesai` }).click()
    await expect(renamed.getByRole('checkbox')).not.toBeChecked()

    // Hapus
    await renamed.getByRole('button', { name: `Hapus ${name} (v2)` }).click()
    await page
      .getByRole('dialog', { name: /^Hapus milestone/ })
      .getByRole('button', { name: 'Hapus milestone' })
      .click()
    await expect(table.getByRole('row').filter({ hasText: name })).toHaveCount(0)
  })

  test.describe('Anggota biasa dan Tamu', () => {
    for (const user of ['wiwiet', 'budi'] as const) {
      test.describe(user, () => {
        test.use({ storageState: authFile(user) })

        test('melihat milestone, tanpa tombol kelola', async ({ page }) => {
          await openMilestones(page)

          await expect(page.getByText('UAT SLMS')).toBeVisible()
          await expect(page.getByRole('button', { name: 'Tambah milestone' })).toHaveCount(0)
          await expect(page.getByRole('button', { name: /^Ubah / })).toHaveCount(0)
          await expect(page.getByRole('button', { name: /^Hapus / })).toHaveCount(0)
          await expect(page.getByRole('checkbox')).toHaveCount(0)
        })

        test('API menolak perubahan milestone (403)', async ({ page, browser }) => {
          const ahmad = await browser.newContext({ storageState: authFile('ahmad') })
          const tree = (await (await ahmad.request.get('/api/projects/tree')).json()) as {
            id: string
            name: string
          }[]
          const sentul = tree.find((p) => p.name === 'Sentul')?.id
          const list = (await (
            await ahmad.request.get(`/api/projects/${sentul}/milestones`)
          ).json()) as { id: string }[]
          await ahmad.close()
          const headers = { 'X-Requested-With': 'ariadne' }

          expect(
            (
              await page.request.post(`/api/projects/${sentul}/milestones`, {
                headers,
                data: { name: 'X', date: '2026-10-06' },
              })
            ).status(),
          ).toBe(403)
          expect(
            (
              await page.request.patch(`/api/milestones/${list[0]?.id}`, {
                headers,
                data: { name: 'Diganti' },
              })
            ).status(),
          ).toBe(403)
          expect(
            (await page.request.delete(`/api/milestones/${list[0]?.id}`, { headers })).status(),
          ).toBe(403)
        })
      })
    }
  })
})
