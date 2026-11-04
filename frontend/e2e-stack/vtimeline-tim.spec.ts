import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { a11yViolations, authFile, preferTheme } from './helpers'

// Timeline Tim untuk supervisor (Fase 7). Data contoh Ahmad (admin + supervisor Tim Sentul dan Tim QA);
// "hari ini" dikunci ke Senin 28 September 2026. Berkas ini berurutan SETELAH tugas-*.spec.ts;
// tes yang menambah data memakai task buatan sendiri yang dihapus lagi.
test.use({ storageState: authFile('ahmad') })

const HEADERS = { 'X-Requested-With': 'ariadne' }

interface TeamResponse {
  people: { userId: string; name: string }[]
}

async function team(
  request: APIRequestContext,
): Promise<{ people: { id: string; name: string }[] }> {
  const response = await request.get('/api/team-timeline')
  expect(response.status()).toBe(200)
  const body = (await response.json()) as TeamResponse
  // Hanya yang bisa diberi task di Sentul (anggota proyek itu)
  const members = (await (
    await request.get(`/api/projects/${await sentulId(request)}/members`)
  ).json()) as { userId: string; role: string }[]
  const ok = new Set(members.filter((m) => m.role !== 'Tamu').map((m) => m.userId))
  return {
    people: body.people
      .filter((p) => ok.has(p.userId))
      .map((p) => ({ id: p.userId, name: p.name })),
  }
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

async function createFor(request: APIRequestContext, title: string, userId: string) {
  const response = await request.post(`/api/projects/${await sentulId(request)}/tasks`, {
    headers: HEADERS,
    data: {
      title,
      status: 'OnProgress',
      priority: 'Low',
      startDate: '2026-09-28',
      dueDate: '2026-09-30',
      assigneeIds: [userId],
    },
  })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: string; key: string }
}

const remove = async (request: APIRequestContext, id: string) =>
  expect((await request.delete(`/api/tasks/${id}`, { headers: HEADERS })).status()).toBe(204)

async function openTimeline(page: Page) {
  await page.goto('/timeline-tim')
  await expect(page.getByRole('heading', { level: 1, name: 'Timeline Tim' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Grafik timeline tim' })).toBeVisible()
}

test.describe('Timeline Tim', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`tampil dan lolos axe, tema ${theme}`, async ({ page }) => {
      await preferTheme(page, theme)
      await openTimeline(page)

      expect(await a11yViolations(page)).toEqual([])
      await expect(page).toHaveScreenshot(`timeline-tim-${theme}.png`, {
        mask: [page.locator('.ar-ttg-right')],
      })
    })
  }

  test('baris orang bisa dibuka dan task dipindahkan dengan dialog, lalu dikembalikan', async ({
    page,
    request,
  }) => {
    const { people } = await team(request)
    const [from, to] = people
    if (!from || !to) throw new Error('Tim contoh butuh minimal dua anggota')
    const task = await createFor(request, 'Uji pindah Fase 7', from.id)
    try {
      await openTimeline(page)
      await page.getByRole('button', { name: `Buka task ${from.name}` }).click()
      await expect(page.getByText(`${task.key} · `)).toBeVisible()

      await page.getByRole('button', { name: `Pindahkan ${task.key} ke anggota lain` }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByText(`${task.key} Uji pindah Fase 7`)).toBeVisible()
      expect(await a11yViolations(page)).toEqual([])
      await dialog.getByRole('radio', { name: new RegExp(to.name) }).check()
      await dialog.getByRole('button', { name: /^Pindahkan/ }).click()

      await expect(dialog).toBeHidden()
      // Task kini ada di bawah penerima, bukan lagi di pemiliknya
      const moved = (await (await request.get(`/api/tasks/${task.id}`)).json()) as {
        task: { assignees: { id: string }[] }
      }
      expect(moved.task.assignees.map((a) => a.id)).toEqual([to.id])
    } finally {
      await remove(request, task.id)
    }
  })

  test('tanggal diubah dari baris task', async ({ page, request }) => {
    const { people } = await team(request)
    const [person] = people
    if (!person) throw new Error('Tim contoh kosong')
    const task = await createFor(request, 'Uji tanggal Fase 7', person.id)
    try {
      await openTimeline(page)
      await page.getByRole('button', { name: `Buka task ${person.name}` }).click()
      await page.getByRole('button', { name: `Ubah tanggal ${task.key}` }).click()
      const dialog = page.getByRole('dialog', { name: 'Ubah tanggal' })
      await expect(dialog).toBeVisible()
      expect(await a11yViolations(page)).toEqual([])
      await dialog.getByRole('button', { name: 'Batal' }).click()
      await expect(dialog).toBeHidden()
    } finally {
      await remove(request, task.id)
    }
  })

  test('dashboard anggota: banner, aksi supervisor, tanpa Tambah task', async ({
    page,
    request,
  }) => {
    const { people } = await team(request)
    const [person] = people
    if (!person) throw new Error('Tim contoh kosong')
    await page.goto(`/dashboard/${person.id}`)

    await expect(page.getByText(/Melihat dashboard:/)).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: `Dashboard ${person.name}` }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tambah task' })).toHaveCount(0)
    expect(await a11yViolations(page)).toEqual([])

    await page.getByRole('button', { name: 'Kembali ke Timeline Tim' }).click()
    await expect(page).toHaveURL(/\/timeline-tim$/)
  })
})

test.describe('Timeline Tim: izin', () => {
  test.describe('anggota biasa', () => {
    test.use({ storageState: authFile('wiwiet') })

    test('API menolak dan menu tidak menampilkan Timeline Tim', async ({ page, request }) => {
      expect((await request.get('/api/team-timeline')).status()).toBe(403)
      await page.goto('/')
      await expect(page.getByRole('link', { name: 'Timeline Tim' })).toHaveCount(0)
    })
  })

  test.describe('tamu', () => {
    test.use({ storageState: authFile('budi') })

    test('API menolak Timeline Tim', async ({ request }) => {
      expect((await request.get('/api/team-timeline')).status()).toBe(403)
    })
  })
})
