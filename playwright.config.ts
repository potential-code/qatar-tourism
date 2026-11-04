import { defineConfig } from '@playwright/test'
import { CLIENT_PORT, CLIENT_URL, CONTEXT_OPTIONS } from './e2e/support/env'

/**
 * End-to-end walkthrough (brief §17) against the frontend-only mockup. One web server: Vite.
 * The demo data lives in the browser, so each run's fresh browser context starts from the seed.
 * Specs run in file order on one worker: the walkthrough (01 to 06, 08) is one connected story
 * in one shared browser context (see e2e/support/walkthrough.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.report' }]],
  outputDir: 'e2e/.results',
  use: {
    ...CONTEXT_OPTIONS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: `cd client && bunx --bun vite --host 127.0.0.1 --port ${CLIENT_PORT} --strictPort`,
    url: CLIENT_URL,
    reuseExistingServer: Boolean(process.env.E2E_REUSE),
    // Piped, not ignored: with its output ignored the Vite dev server never starts listening here.
    stdout: 'pipe',
    // The specs test the app, not the Basic Auth gate in front of it.
    // Its own Vite cache, so a developer's dev server on another port cannot stall this one.
    env: { BASIC_AUTH: 'off', VITE_CACHE_DIR: 'node_modules/.vite-e2e' },
    timeout: 60_000,
  },
})
