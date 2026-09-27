import { defineConfig, devices } from '@playwright/test'

/**
 * Test di browser sungguhan: screenshot pembanding, pemeriksaan aksesibilitas (axe),
 * dan perilaku keyboard. Menjalankan server Vite sendiri bila belum jalan.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  expect: {
    // Toleransi kecil untuk perbedaan anti-aliasing huruf
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
