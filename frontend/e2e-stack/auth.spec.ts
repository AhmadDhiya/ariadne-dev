import { expect, test } from '@playwright/test'
import { a11yViolations, preferTheme, seedPassword, USERS } from './helpers'

const MAILPIT = process.env.ARIADNE_MAILPIT_URL ?? 'http://localhost:18025'

test.describe('halaman masuk dan sesi (tanpa login sebelumnya)', () => {
  test('tampil sesuai mockup, lolos aksesibilitas di tema terang dan gelap', async ({ page }) => {
    await page.goto('/masuk')
    await expect(page.getByRole('heading', { name: 'Masuk' })).toBeVisible()
    await expect(page.getByText('Benang merah setiap proyek.')).toBeVisible()
    expect(await a11yViolations(page)).toEqual([])
    await expect(page).toHaveScreenshot('masuk-terang.png')

    await preferTheme(page, 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await a11yViolations(page)).toEqual([])
    await expect(page).toHaveScreenshot('masuk-gelap.png')
  })

  test('password salah: pesan umum, tetap di halaman masuk, tidak ada cookie login', async ({
    page,
    context,
  }) => {
    await page.goto('/masuk')
    await page.getByLabel('Email').fill(USERS.ahmad.email)
    await page.getByLabel('Password').fill('password-yang-jelas-salah')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page.getByRole('alert')).toHaveText('Email atau password salah.')
    await expect(page).toHaveURL(/\/masuk$/)
    expect((await context.cookies()).some((c) => c.name === 'ariadne.auth')).toBe(false)
  })

  test('email yang tidak terdaftar mendapat pesan yang sama persis', async ({ page }) => {
    await page.goto('/masuk')
    await page.getByLabel('Email').fill('tidak.ada@perusahaan.co.id')
    await page.getByLabel('Password').fill('password-yang-jelas-salah')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page.getByRole('alert')).toHaveText('Email atau password salah.')
  })

  test('cookie login HttpOnly dan SameSite=Strict, tidak terbaca JavaScript', async ({
    page,
    context,
  }) => {
    await page.goto('/masuk')
    await page.getByLabel('Email').fill(USERS.wiwiet.email)
    await page.getByLabel('Password').fill(seedPassword())
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL((u) => u.pathname === '/')

    const cookie = (await context.cookies()).find((c) => c.name === 'ariadne.auth')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('Strict')
    expect(await page.evaluate(() => document.cookie)).not.toContain('ariadne.auth')
    // Tidak ada token yang disimpan di penyimpanan browser
    const storage = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    )
    expect(storage.toLowerCase()).not.toMatch(/token|password|auth/)
  })

  test('alamat yang butuh login mengarahkan ke halaman masuk lalu kembali ke alamat itu', async ({
    page,
  }) => {
    await page.goto('/tim')
    await expect(page).toHaveURL(/\/masuk\?next=%2Ftim$/)

    await page.getByLabel('Email').fill(USERS.ahmad.email)
    await page.getByLabel('Password').fill(seedPassword())
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page).toHaveURL(/\/tim$/)
    await expect(page.getByRole('heading', { name: 'Tim', level: 1 })).toBeVisible()
  })

  test('pengalihan setelah login tidak pernah keluar dari aplikasi (open redirect)', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/masuk?next=https%3A%2F%2Fsitus-jahat.example%2Fcuri')
    await page.getByLabel('Email').fill(USERS.ahmad.email)
    await page.getByLabel('Password').fill(seedPassword())
    await page.getByRole('button', { name: 'Masuk' }).click()

    await page.waitForURL((u) => u.pathname === '/')
    expect(new URL(page.url()).origin).toBe(new URL(baseURL ?? '').origin)
    expect(page.url()).not.toContain('situs-jahat')
  })

  test('keluar mengakhiri sesi: halaman terlindungi tidak bisa dibuka lagi', async ({ page }) => {
    await page.goto('/masuk')
    await page.getByLabel('Email').fill(USERS.wiwiet.email)
    await page.getByLabel('Password').fill(seedPassword())
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL((u) => u.pathname === '/')

    await page.getByRole('button', { name: /Menu akun/ }).click()
    await page.getByRole('option', { name: 'Keluar' }).click()

    await expect(page).toHaveURL(/\/masuk$/)
    await page.goto('/tim')
    await expect(page).toHaveURL(/\/masuk\?next=/)
    expect((await page.request.get('/api/auth/me')).status()).toBe(401)
  })

  test('lupa password: jawaban sama untuk email terdaftar dan tidak, dan email sampai ke Mailpit', async ({
    page,
    request,
  }) => {
    const ask = async (email: string) => {
      await page.goto('/lupa-password')
      await page.getByLabel('Email').fill(email)
      await page.getByRole('button', { name: 'Kirim tautan' }).click()
      return page.getByRole('status').innerText()
    }

    const known = await ask(USERS.budi.email)
    const unknown = await ask('tidak.ada@perusahaan.co.id')
    expect(known).toBe(unknown)
    expect(known).toContain('Jika email itu terdaftar')

    // Email sungguhan masuk ke Mailpit (SMTP asli, bukan tiruan)
    await expect
      .poll(
        async () => {
          const list = await (
            await request.get(
              `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${USERS.budi.email}`)}`,
            )
          ).json()
          return list.messages?.length ?? 0
        },
        { timeout: 15_000 },
      )
      .toBeGreaterThan(0)

    const list = await (
      await request.get(
        `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${USERS.budi.email}`)}`,
      )
    ).json()
    const message = await (
      await request.get(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)
    ).json()
    expect(message.Subject).toBe('Atur ulang password Ariadne')
    expect(message.Text).toMatch(/\/reset-password#email=.+&token=.+/)
    expect(message.Text).not.toContain('?token=')

    // Tidak ada email untuk alamat yang tidak terdaftar
    const none = await (
      await request.get(
        `${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:tidak.ada@perusahaan.co.id')}`,
      )
    ).json()
    expect(none.messages ?? []).toHaveLength(0)

    // Tautan dari email membuka form; token langsung dihapus dari alamat dan riwayat browser
    const link = /(https?:\/\/\S+\/reset-password#\S+)/.exec(message.Text)?.[1]
    expect(link).toBeTruthy()
    await page.goto((link ?? '').replace(/^https?:\/\/[^/]+/, ''))
    await expect(page.getByRole('heading', { name: 'Pilih password baru' })).toBeVisible()
    await expect(page.getByText(USERS.budi.email)).toBeVisible()
    expect(page.url()).not.toContain('token')
    expect(await a11yViolations(page)).toEqual([])
  })

  test('tautan reset yang rusak menampilkan pesan, bukan form kosong', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByText('Tautan tidak lengkap')).toBeVisible()

    await page.goto('about:blank') // tautan baru, bukan sekadar ganti hash di halaman yang sama
    await page.goto('/reset-password#email=ahmad%40perusahaan.co.id&token=token-asal')
    await page.getByLabel('Password baru', { exact: true }).fill('kalimat-sandi-baru-yang-panjang')
    await page.getByLabel('Ulangi password baru').fill('kalimat-sandi-baru-yang-panjang')
    await page.getByRole('button', { name: 'Simpan password' }).click()
    await expect(page.getByRole('alert')).toContainText('Tautan tidak valid atau sudah kedaluwarsa')
  })

  test('form reset memeriksa panjang dan kecocokan password sebelum mengirim', async ({ page }) => {
    await page.goto('/reset-password#email=ahmad%40perusahaan.co.id&token=apa-saja')

    await page.getByLabel('Password baru', { exact: true }).fill('pendek')
    await page.getByLabel('Ulangi password baru').fill('pendek')
    await page.getByRole('button', { name: 'Simpan password' }).click()
    await expect(page.getByText('Password minimal 12 karakter.')).toBeVisible()

    await page.getByLabel('Password baru', { exact: true }).fill('kalimat-sandi-yang-panjang')
    await page.getByLabel('Ulangi password baru').fill('kalimat-sandi-lain-lagi')
    await page.getByRole('button', { name: 'Simpan password' }).click()
    await expect(page.getByText('Konfirmasi password tidak sama.')).toBeVisible()
  })
})
