/**
 * Import first in any test that loads the app: config/env.ts validates process.env the moment
 * it is imported. The database URL points nowhere; postgres.js only connects on a query, and
 * these tests never make one.
 */
const testEnv: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test',
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:8000',
  CLIENT_URL: 'http://localhost:5173',
}

for (const [key, value] of Object.entries(testEnv)) process.env[key] ??= value

export const CLIENT_ORIGIN = 'http://localhost:5173'
