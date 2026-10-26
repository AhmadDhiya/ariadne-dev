import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { authFile, seedPassword, USERS, type UserKey } from './helpers'

/**
 * Login sekali untuk setiap peran lewat halaman masuk yang sebenarnya, lalu simpan sesinya.
 * Test lain memakai sesi itu, jadi tidak ada ratusan login (dan batas percobaan login tidak terpicu).
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:18080'
  const password = seedPassword()
  const browser = await chromium.launch()

  for (const key of Object.keys(USERS) as UserKey[]) {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    await page.goto('/masuk')
    await page.getByLabel('Email').fill(USERS[key].email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    mkdirSync(dirname(authFile(key)), { recursive: true })
    await context.storageState({ path: authFile(key) })
    await context.close()
  }

  await browser.close()
}
