import { defineConfig } from 'drizzle-kit'

// Runs from the repository root under Bun, which loads .env itself.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  strict: true,
  verbose: true,
})
