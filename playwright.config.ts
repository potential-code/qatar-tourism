import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end walkthrough (brief §17) against a real API and client. The global setup resets the
 * demo through the admin reset endpoint, so every run starts from the same snapshot. Specs run
 * in file order on one worker: the walkthrough is a single connected story.
 */
const API_URL = 'http://localhost:8100'
const CLIENT_URL = 'http://localhost:5200'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  outputDir: 'e2e/.results',
  use: {
    baseURL: CLIENT_URL,
    timezoneId: 'Asia/Qatar',
    locale: 'en-GB',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: 'bun run server/index.ts',
      url: `${API_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { API_RATE_LIMIT_PER_MINUTE: '5000', CREDENTIAL_RATE_LIMIT: '1000' },
    },
    {
      command: 'cd client && bunx --bun vite --host 0.0.0.0 --port 5200 --strictPort',
      url: CLIENT_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
