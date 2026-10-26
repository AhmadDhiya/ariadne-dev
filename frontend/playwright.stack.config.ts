import { defineConfig, devices } from '@playwright/test'

/**
 * Test browser terhadap APLIKASI SUNGGUHAN di Docker (nginx + API + PostgreSQL + Mailpit), bukan data tiruan.
 * Butuh `docker compose up --build` sudah menyala dan data contoh (SEED_PASSWORD di .env).
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
