#!/usr/bin/env node
// Mengubah ikon status dari docs/design/design-system/assets/Icons (SVG) menjadi PNG 32x32 untuk email notifikasi.
// Banyak aplikasi email (mis. Gmail) tidak menampilkan SVG, jadi email memakai PNG hasil skrip ini.
// Jalankan ulang hanya bila ikon di design system berubah:
//
//   node scripts/render-email-icons.mjs
//
// Memakai Playwright (Chromium) yang sudah terpasang untuk test browser frontend; tidak ada paket baru.
import { createRequire } from 'node:module'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'docs/design/design-system/assets/Icons')
const target = join(root, 'backend/src/Ariadne.Api/Features/Notifications/EmailIcons')
const { chromium } = createRequire(join(root, 'frontend/package.json'))('@playwright/test')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 32, height: 32 }, deviceScaleFactor: 1 })
for (const file of readdirSync(source).filter((f) => f.startsWith('status-') && f.endsWith('.svg'))) {
  const svg = readFileSync(join(source, file), 'utf8').replace('width="24" height="24"', 'width="32" height="32"')
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  await page.locator('svg').screenshot({ path: join(target, file.replace('.svg', '.png')), omitBackground: true })
  console.log(`${file} → ${file.replace('.svg', '.png')}`)
}
await browser.close()
