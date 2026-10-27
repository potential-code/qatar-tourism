/**
 * Import first in any test that loads the app: config/env.ts validates process.env the moment
 * it is imported.
 *
 * DATABASE_URL is forced to TEST_DATABASE_URL (qatar_tourism_test), so no test can reach the
 * development database, whichever file bun loads first. Without TEST_DATABASE_URL it points
 * nowhere: postgres.js connects lazily and tests that never query still pass.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (testDatabaseUrl && !/test/i.test(new URL(testDatabaseUrl).pathname)) {
  throw new Error('TEST_DATABASE_URL must point at a database whose name contains "test"')
}

const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:8000',
  CLIENT_URL: 'http://localhost:5173',
  DEMO_REFERENCE_DATE: '2026-10-27',
  SEED_DEMO_PASSWORD: 'DemoAcademy2026!',
}

for (const [key, value] of Object.entries(testEnv)) process.env[key] = value
process.env.DATABASE_URL = testDatabaseUrl ?? 'postgres://test:test@127.0.0.1:1/test'

export const CLIENT_ORIGIN = 'http://localhost:5173'
export const HAS_TEST_DB = Boolean(testDatabaseUrl)
