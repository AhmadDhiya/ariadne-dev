import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Drawer detail task (Fase 4). Data contoh Sentul; "hari ini" dikunci ke Senin 28 September 2026.
// Nama file ini sengaja berurutan SETELAH tasks.spec.ts: tes di sini menambah data (di task buatan sendiri, dihapus lagi).
test.use({ storageState: authFile('ahmad') })

const HEADERS = { 'X-Requested-With': 'ariadne' }
const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Navigasi utama' })
const row = (page: Page, key: string) => page.getByRole('row').filter({ hasText: key })
const drawerOf = (page: Page) => page.locator('dialog.ar-drawer')

async function openSentul(page: Page) {
  await page.goto('/')
  await sidebar(page).getByRole('link', { name: 'Sentul', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(row(page, 'SEN-101')).toBeVisible()
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

/** Membuat task di Sentul lewat API (sebagai pengguna login); mengembalikan id dan kunci tampilannya. */
async function createTask(
  request: APIRequestContext,
  title: string,
  extra: Record<string, unknown> = {},
): Promise<{ id: string; key: string }> {
  const response = await request.post(`/api/projects/${await sentulId(request)}/tasks`, {
    headers: HEADERS,
    data: { title, ...extra },
  })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: string; key: string }
}

test.describe('Drawer detail task: tampilan sesuai mockup 05 (data contoh)', () => {
  test('kolom Update terakhir di tabel terisi dari Update terbaru', async ({ page }) => {
    await openSentul(page)

    await expect(row(page, 'SEN-115')).toContainText('Runner gagal konek ke staging')
    await expect(row(page, 'SEN-115')).toContainText('Wiwiet · 08.40')
    await expect(row(page, 'SEN-101')).toContainText('Spesifikasi final dikirim ke klien')
    await expect(row(page, 'SEN-101')).toContainText('Ahmad · 18 Sep')
    await expect(row(page, 'SEN-112')).toContainText('Khalil · Kemarin')
    await expect(row(page, 'SEN-130')).toContainText('—') // belum ada update
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`SEN-115 dibuka lewat alamat, lolos axe, dan sesuai screenshot acuan, tema ${theme === 'light' ? 'terang' : 'gelap'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1100 }) // setinggi mockup 05
      await preferTheme(page, theme)
      await openSentul(page)
      await page.goto(`${page.url()}?task=SEN-115`)
      const drawer = drawerOf(page)

      await expect(drawer).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(drawer.getByText('Sentul / Dispatch')).toBeVisible()
      await expect(drawer.getByRole('button', { name: 'Pipeline GitLab IRS' })).toBeVisible()
      const fields = drawer.locator('.ar-taskdrawer-fields')
      await expect(fields).toContainText('Blocked')
      await expect(fields).toContainText('Critical')
      await expect(fields).toContainText('Wiwiet')
      await expect(fields).toContainText('Ahmad')
      await expect(fields).toContainText('21 Sep –')
      await expect(fields).toContainText('telat 3 hari')
      await expect(fields).toContainText('DevOps')
      await expect(drawer.getByRole('region', { name: 'Alasan tertahan' })).toContainText(
        'Runner GitLab belum bisa mengakses server staging',
      )
      await expect(drawer.getByRole('button', { name: 'Ubah Menunggu siapa' })).toContainText(
        'Manto',
      )

      // Aktivitas: komentar tamu, internal, komentar dengan @mention, update, dan dua baris log
      const timeline = drawer.getByRole('region', { name: 'Aktivitas' })
      await expect(timeline).toContainText('Pak Budi')
      await expect(timeline.getByText('Tamu', { exact: true })).toBeVisible()
      await expect(timeline).toContainText('Kalau firewall belum dibuka Rabu')
      await expect(timeline.locator('.ar-mention')).toHaveText('@Ahmad')
      await expect(timeline).toContainText('mengubah status On Progress → Blocked')
      await expect(timeline).toContainText('mengganti PIC Rama → Wiwiet')

      expect(await a11yViolations(page)).toEqual([])
      await expect(drawer).toHaveScreenshot(`drawer-sen115-${theme}.png`)
    })
  }

  test('Esc menutup drawer dan alamat kembali tanpa ?task', async ({ page }) => {
    await openSentul(page)
    await row(page, 'SEN-104').getByRole('button', { name: 'Integrasi log & metrics' }).click()
    await expect(drawerOf(page)).toBeVisible()
    await expect(page).toHaveURL(/task=SEN-104/)

    await page.keyboard.press('Escape')

    await expect(drawerOf(page)).toBeHidden()
    await expect(page).not.toHaveURL(/task=/)
    await expect(row(page, 'SEN-104')).toBeVisible()
  })

  test('task yang tidak ada memberi pesan, bukan layar kosong', async ({ page }) => {
    await openSentul(page)
    await page.goto(`${page.url()}?task=SEN-99999`)

    await expect(drawerOf(page).getByRole('alert')).toContainText('Task tidak ditemukan')
  })
})

test.describe('Drawer detail task: mengubah di tempat dan menulis aktivitas', () => {
  test('status, alasan tertahan, bidang lain, dan aktivitas pada task buatan sendiri', async ({
    page,
    request,
  }) => {
    const title = `Uji drawer ${Date.now()}`
    const task = await createTask(request, title)
    await openSentul(page)
    await row(page, title).getByRole('button', { name: title }).click()
    const drawer = drawerOf(page)
    await expect(drawer).toBeVisible()
    const fields = drawer.locator('.ar-taskdrawer-fields')
    const timeline = drawer.getByRole('region', { name: 'Aktivitas' })
    await expect(timeline).toContainText('membuat task ini')

    // Status biasa: langsung tersimpan dan tercatat di aktivitas
    await fields.getByRole('button', { name: /Not Started/ }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'On Progress' })
      .click()
    await expect(fields.getByRole('button', { name: /On Progress/ })).toBeVisible()
    await expect(timeline).toContainText('mengubah status Not Started → On Progress')

    // Status tertahan: dialog alasan dulu; alasan wajib
    await fields.getByRole('button', { name: /On Progress/ }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'Blocked' })
      .click()
    const hold = page.getByRole('dialog', { name: /Ubah status ke/ })
    await hold.getByRole('button', { name: 'Simpan status' }).click()
    await expect(hold.getByText('Alasan tertahan wajib diisi.')).toBeVisible()
    await hold.getByLabel(/^Alasan tertahan/).fill('Menunggu akun dari klien')
    await hold.getByRole('button', { name: 'Simpan status' }).click()
    await expect(hold).toBeHidden()
    const holdBlock = drawer.getByRole('region', { name: 'Alasan tertahan' })
    await expect(holdBlock).toContainText('Menunggu akun dari klien')
    await expect(timeline).toContainText('mengubah status On Progress → Blocked')

    // Alasan diubah di tempat dan "menunggu siapa" diisi, tanpa mengubah status (tidak ada log status baru)
    await holdBlock.getByRole('button', { name: 'Menunggu akun dari klien' }).click()
    await holdBlock
      .getByRole('textbox', { name: 'Alasan tertahan' })
      .fill('Akun klien belum dibuat')
    await holdBlock.getByRole('button', { name: 'Simpan' }).click()
    await expect(holdBlock).toContainText('Akun klien belum dibuat')
    await holdBlock.getByRole('button', { name: 'Ubah Menunggu siapa' }).click()
    const waiting = holdBlock.getByRole('dialog', { name: 'Ubah Menunggu siapa' })
    await waiting.getByLabel('Orang di proyek').selectOption({ label: 'Wiwiet' })
    await waiting.getByRole('button', { name: 'Simpan' }).click()
    await expect(holdBlock.getByRole('button', { name: 'Ubah Menunggu siapa' })).toContainText(
      'Wiwiet',
    )
    await expect(timeline.getByText(/mengubah status/)).toHaveCount(2)

    // Kembali ke status biasa: kotak alasan hilang
    await fields.getByRole('button', { name: /Blocked/ }).click()
    await page
      .getByRole('listbox', { name: 'Ubah status' })
      .getByRole('option', { name: 'On Progress' })
      .click()
    await expect(holdBlock).toHaveCount(0)

    // Judul dan keterangan
    await drawer.getByRole('button', { name: title }).click()
    await drawer.getByRole('textbox', { name: 'Judul' }).fill(`${title} (v2)`)
    await drawer.getByRole('button', { name: 'Simpan' }).click()
    await expect(row(page, `${title} (v2)`)).toBeVisible()
    await drawer.getByRole('button', { name: 'Tambahkan keterangan' }).click()
    await drawer.getByRole('textbox', { name: 'Keterangan' }).fill('Dikerjakan bertahap.')
    await drawer.getByRole('button', { name: 'Simpan' }).click()
    await expect(drawer.getByRole('button', { name: 'Dikerjakan bertahap.' })).toBeVisible()

    // Prioritas
    await drawer.getByRole('button', { name: 'Ubah prioritas' }).click()
    await page
      .getByRole('listbox', { name: 'Ubah prioritas' })
      .getByRole('option', { name: /High/ })
      .click()
    await expect(fields).toContainText('High')
    await expect(row(page, `${title} (v2)`)).toContainText('High')

    // PIC lewat panel; Esc menutup panelnya saja, bukan drawer
    await drawer.getByRole('button', { name: 'Ubah PIC' }).click()
    const picPanel = drawer.getByRole('dialog', { name: 'Ubah PIC' })
    await expect(picPanel).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(picPanel).toBeHidden()
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: 'Ubah PIC' }).click()
    await picPanel.getByRole('checkbox', { name: 'Rama' }).check()
    await picPanel.getByRole('button', { name: 'Simpan' }).click()
    await expect(fields).toContainText('Rama')
    await expect(timeline).toContainText('menambahkan Rama sebagai PIC')

    // Tanggal dan label
    await drawer.getByRole('button', { name: 'Ubah Tanggal' }).click()
    const datePanel = drawer.getByRole('dialog', { name: 'Ubah Tanggal' })
    await datePanel.getByLabel('Mulai').fill('2026-09-29')
    await datePanel.getByLabel('Selesai').fill('2026-10-01')
    await datePanel.getByRole('button', { name: 'Simpan' }).click()
    await expect(fields).toContainText('29 Sep –')
    await expect(fields).toContainText('· 3 hari')
    await expect(timeline).toContainText('mengubah tanggal tanpa tanggal → 29 Sep – 1 Okt')
    await drawer.getByRole('button', { name: 'Ubah Label' }).click()
    const labelPanel = drawer.getByRole('dialog', { name: 'Ubah Label' })
    await labelPanel.getByRole('combobox', { name: /^Label/ }).fill('E2E, UAT')
    await labelPanel.getByRole('button', { name: 'Simpan' }).click()
    await expect(fields).toContainText('E2E')

    // Tanggal terbalik ditolak server dengan pesan di panelnya
    await drawer.getByRole('button', { name: 'Ubah Tanggal' }).click()
    await datePanel.getByLabel('Selesai').fill('2026-10-05')
    await datePanel.getByLabel('Mulai').fill('2026-10-04')
    await datePanel.getByRole('button', { name: 'Simpan' }).click()
    await page.keyboard.press('Escape')

    // Aktivitas: Update tampil di timeline dan di kolom "Update terakhir" tabel
    const box = drawer.getByRole('combobox', { name: 'Tulis komentar' })
    await drawer.getByRole('button', { name: 'Update', exact: true }).click()
    await drawer.getByRole('combobox', { name: 'Tulis update' }).fill('Setengah jalan')
    await drawer.getByRole('button', { name: 'Kirim' }).click()
    await expect(timeline).toContainText('Setengah jalan')
    await expect(timeline.getByText('Update', { exact: true })).toBeVisible()

    // Komentar dengan @mention lewat keyboard
    await drawer.getByRole('button', { name: 'Komentar', exact: true }).click()
    await box.click()
    await page.keyboard.type('Tolong dicek @wiw')
    await expect(page.getByRole('option', { name: /Wiwiet/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(box).toHaveValue('Tolong dicek @Wiwiet ')
    await page.keyboard.type('ya')
    await drawer.getByRole('button', { name: 'Kirim' }).click()
    await expect(timeline.locator('.ar-mention')).toHaveText('@Wiwiet')
    await expect(box).toHaveValue('')

    // Internal
    await drawer.getByRole('button', { name: 'Internal', exact: true }).click()
    await drawer
      .getByRole('combobox', { name: 'Tulis catatan internal' })
      .fill('Jangan dibaca tamu')
    await drawer.getByRole('button', { name: 'Kirim' }).click()
    await expect(timeline).toContainText('Jangan dibaca tamu')

    // Tutup: kolom Update terakhir di tabel memakai update tadi
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(row(page, `${title} (v2)`)).toContainText('Setengah jalan')
    await expect(row(page, `${title} (v2)`)).toContainText('Ahmad ·')

    // Dibuka lagi lewat alamat: semuanya tersimpan
    await page.goto(`${page.url().split('?')[0]}?task=${task.key}`)
    await expect(drawerOf(page).getByRole('button', { name: `${title} (v2)` })).toBeVisible()
    await expect(drawerOf(page).getByRole('region', { name: 'Aktivitas' })).toContainText(
      'Jangan dibaca tamu',
    )

    // Ubah komentar sendiri (@mention tetap disorot), lalu hapus catatan internal dan update
    const reopened = drawerOf(page)
    const log = reopened.getByRole('region', { name: 'Aktivitas' })
    const comment = log.locator('.ar-act-comment').filter({ hasText: 'Tolong dicek' })
    await comment.getByRole('button', { name: /^Ubah tulisan/ }).click()
    await reopened
      .getByRole('combobox', { name: 'Ubah komentar' })
      .fill('Tolong dicek @Wiwiet, sudah dibahas')
    await reopened.getByRole('button', { name: 'Simpan' }).click()
    await expect(comment).toContainText('sudah dibahas')
    await expect(comment).toContainText('diubah')
    await expect(comment.locator('.ar-mention')).toHaveText('@Wiwiet')

    const note = log.locator('.ar-act-internal')
    await note.getByRole('button', { name: /^Hapus tulisan/ }).click()
    await expect(note).toContainText('Hapus entri ini?')
    await note.getByRole('button', { name: 'Batal' }).click() // batal tidak menghapus
    await expect(note).toContainText('Jangan dibaca tamu')
    await note.getByRole('button', { name: /^Hapus tulisan/ }).click()
    await note.getByRole('button', { name: 'Ya, hapus' }).click()
    await expect(log).not.toContainText('Jangan dibaca tamu')

    await log
      .locator('.ar-act-update')
      .getByRole('button', { name: /^Hapus tulisan/ })
      .click()
    await log.locator('.ar-act-update').getByRole('button', { name: 'Ya, hapus' }).click()
    await expect(log).not.toContainText('Setengah jalan')
    await page.keyboard.press('Escape')
    await expect(row(page, `${title} (v2)`)).not.toContainText('Setengah jalan') // kolom Update terakhir ikut kosong

    // Bersihkan
    const removed = await request.delete(`/api/tasks/${task.id}`, { headers: HEADERS })
    expect(removed.status()).toBe(204)
  })

  test('sub-task: dibuka dari induknya dan kembali lewat tautan "Sub-task dari"', async ({
    page,
    request,
  }) => {
    const title = `Induk drawer ${Date.now()}`
    const parent = await createTask(request, title)
    const sub = await request.post(`/api/tasks/${parent.id}/subtasks`, {
      headers: HEADERS,
      data: { title: 'Anak drawer' },
    })
    expect(sub.status()).toBe(201)
    const child = (await sub.json()) as { key: string }
    await openSentul(page)
    await page.goto(`${page.url()}?task=${parent.key}`)
    const drawer = drawerOf(page)

    await expect(drawer.getByRole('region', { name: 'Sub-task' })).toContainText('0/1')
    await expect(drawer.getByRole('region', { name: 'Aktivitas' })).toContainText(
      `menambahkan sub-task ${child.key} Anak drawer`,
    )
    await drawer.getByRole('button', { name: 'Anak drawer' }).click()
    await expect(page).toHaveURL(new RegExp(`task=${child.key}`))
    await expect(drawer.getByRole('button', { name: 'Anak drawer' }).first()).toBeVisible()
    await expect(drawer.getByRole('region', { name: 'Sub-task' })).toHaveCount(0)

    await drawer.getByRole('button', { name: `Sub-task dari ${parent.key}` }).click()
    await expect(page).toHaveURL(new RegExp(`task=${parent.key}`))
    await expect(drawer.getByRole('button', { name: title })).toBeVisible()

    expect((await request.delete(`/api/tasks/${parent.id}`, { headers: HEADERS })).status()).toBe(
      204,
    )
  })
})

test.describe('Drawer detail task: Tamu', () => {
  test.use({ storageState: authFile('budi') })

  test('hanya membaca dan berkomentar; catatan internal tidak pernah terlihat', async ({
    page,
    browser,
  }) => {
    // Task contoh dari Ahmad, dengan catatan internal dan update
    const ahmad = await browser.newContext({ storageState: authFile('ahmad') })
    const title = `Untuk tamu ${Date.now()}`
    const task = await createTask(ahmad.request, title)
    for (const [kind, body] of [
      ['Internal', 'RAHASIA-TIM-INTERNAL'],
      ['Update', 'Update yang boleh dibaca tamu'],
    ] as const) {
      const posted = await ahmad.request.post(`/api/tasks/${task.id}/activities`, {
        headers: HEADERS,
        data: { kind, body },
      })
      expect(posted.status()).toBe(201)
    }

    await openSentul(page)
    await row(page, title).getByRole('button', { name: title }).click()
    const drawer = drawerOf(page)
    await expect(drawer).toBeVisible()
    const timeline = drawer.getByRole('region', { name: 'Aktivitas' })

    // Update terlihat, Internal tidak ada di mana pun (timeline, kolom tabel, isi halaman)
    await expect(timeline).toContainText('Update yang boleh dibaca tamu')
    await expect(page.locator('body')).not.toContainText('RAHASIA-TIM-INTERNAL')
    await expect(timeline.getByText('Internal', { exact: true })).toHaveCount(0)

    // Kontrol ubah disembunyikan, bukan dinonaktifkan
    for (const name of [
      'Ubah prioritas',
      'Ubah PIC',
      'Ubah Tanggal',
      'Ubah Label',
      'Tambah sub-task',
    ]) {
      await expect(drawer.getByRole('button', { name })).toHaveCount(0)
    }
    await expect(drawer.getByRole('button', { name: title })).toHaveCount(0) // judul teks biasa
    await expect(drawer.getByRole('button', { name: 'Update', exact: true })).toHaveCount(0)
    await expect(drawer.getByRole('button', { name: 'Internal', exact: true })).toHaveCount(0)
    await expect(drawer.getByRole('button', { name: 'Komentar', exact: true })).toBeVisible()
    await drawer.getByRole('button', { name: 'Aksi lain' }).click()
    await expect(page.getByRole('listbox', { name: 'Aksi lain' }).getByRole('option')).toHaveCount(
      1,
    )
    await page.keyboard.press('Escape')

    // Komentar dengan @mention anggota tim
    const box = drawer.getByRole('combobox', { name: 'Tulis komentar' })
    await box.click()
    await page.keyboard.type('Terima kasih @wiw')
    await page.getByRole('option', { name: /Wiwiet/ }).click()
    await drawer.getByRole('button', { name: 'Kirim' }).click()
    await expect(timeline).toContainText('Pak Budi')
    await expect(timeline.locator('.ar-mention')).toHaveText('@Wiwiet')
    await expect(timeline.getByText('Tamu', { exact: true })).toBeVisible()

    // Hanya tulisan sendiri yang bisa diubah dan dihapus; update milik Ahmad tidak
    await expect(timeline.getByRole('button', { name: /^Ubah tulisan/ })).toHaveCount(1)
    await expect(timeline.getByRole('button', { name: /^Hapus tulisan/ })).toHaveCount(1)
    const mine = timeline.locator('.ar-act-comment').filter({ hasText: 'Terima kasih' })
    await mine.getByRole('button', { name: /^Ubah tulisan/ }).click()
    await drawer
      .getByRole('combobox', { name: 'Ubah komentar' })
      .fill('Terima kasih banyak @Wiwiet')
    await drawer.getByRole('button', { name: 'Simpan' }).click()
    await expect(mine).toContainText('banyak')
    await expect(mine).toContainText('diubah')
    await mine.getByRole('button', { name: /^Hapus tulisan/ }).click()
    await mine.getByRole('button', { name: 'Ya, hapus' }).click()
    await expect(timeline).not.toContainText('Terima kasih banyak')

    // API: Tamu tidak bisa menulis Update atau Internal, dan tidak menerima Internal
    const denied = await page.request.post(`/api/tasks/${task.id}/activities`, {
      headers: HEADERS,
      data: { kind: 'Internal', body: 'Coba' },
    })
    expect(denied.status()).toBe(403)
    const raw = await (await page.request.get(`/api/tasks/${task.id}/activities`)).text()
    expect(raw).not.toContain('RAHASIA-TIM-INTERNAL')

    expect(
      (await ahmad.request.delete(`/api/tasks/${task.id}`, { headers: HEADERS })).status(),
    ).toBe(204)
    await ahmad.close()
  })

  test('proyek yang tidak boleh dilihat tidak bisa dibuka lewat ?task=', async ({ page }) => {
    await openSentul(page)
    await page.goto(`${page.url()}?task=MDC-1`)

    await expect(drawerOf(page).getByRole('alert')).toContainText('Task tidak ditemukan')
  })
})
