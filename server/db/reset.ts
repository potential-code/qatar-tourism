import { closeDb, db } from '@server/db/connection'
import { demoMeta } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { SEED_VERSION } from '@server/db/seed/reference-date'
import { clearUploads } from '@server/modules/assignments/assignments.storage'

/**
 * `bun run db:seed` / `bun run db:reset` in development, and `bun dist/reset.js` in the server
 * image: restores the deterministic demo snapshot and empties uploaded demo files. The same
 * operation as the admin reset (POST /api/demo/reset).
 */
try {
  const { referenceDate } = await reseed()
  await clearUploads()
  const [meta] = await db.select().from(demoMeta)
  console.log(`Seeded demo data (reference date ${referenceDate}, version ${SEED_VERSION}).`)
  console.log(meta?.counts)
} catch (error) {
  console.error('Seed failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await closeDb()
}
