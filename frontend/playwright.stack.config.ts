import { defineConfig, devices } from '@playwright/test'

/**
 * Test browser terhadap APLIKASI SUNGGUHAN di Docker (nginx + API + PostgreSQL + Mailpit), bukan data tiruan.
 * Butuh stack yang menyala DENGAN data contoh (SEED_PASSWORD terisi). `node scripts/check.mjs` membuat stack
 * terpisah khusus untuk ini (port lain, database sementara), jadi data kerja Anda tidak tersentuh.
 * Manual: isi SEED_PASSWORD di .env pada database kosong, lalu `docker compose up --build`.
 * Dijalankan satu per satu (workers: 1) karena memakai database yang sama.
 */
export default defineConfig({
  testDir: './e2e-stack',
  globalSetup: './e2e-stack/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.ARIADNE_STACK_URL ?? 'http://localhost:18080',
    trace: 'retain-on-failure',
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  projects: [
    {
      name: 'stack',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
