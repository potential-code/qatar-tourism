import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { env } from '@server/config/env'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * Standalone migrator, run by entrypoint.sh before the server starts. It applies the SQL files
 * that `bun run db:generate` wrote to server/db/migrations. It never generates anything itself.
 *
 * The folder is resolved from this file. Source (server/db/migrate.ts) and bundle
 * (server/dist/migrate.js, or /app/dist/migrate.js in the image) both sit one level below the
 * directory that holds db/migrations, so `../db/migrations` works for both.
 */
const migrationsFolder = join(import.meta.dir, '../db/migrations')

async function main() {
  if (!existsSync(join(migrationsFolder, 'meta/_journal.json'))) {
    // Fail rather than boot against an empty database: every query would 500.
    console.error(
      `No migrations found in ${migrationsFolder}. Generate them with "bun run db:generate" ` +
        'and commit them before deploying.',
    )
    process.exit(1)
  }

  // One connection is enough, and closing it lets the process exit.
  const client = postgres(env.DATABASE_URL, { max: 1 })
  try {
    await migrate(drizzle({ client }), { migrationsFolder })
    console.log('Migrations applied')
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
