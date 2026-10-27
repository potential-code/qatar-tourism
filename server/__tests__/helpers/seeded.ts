import { db } from '@server/db/connection'
import { demoMeta } from '@server/db/schema'
import { reseed } from '@server/db/seed'

/** Seeds the test database once if it is empty or seeded for another date. */
export async function ensureSeeded(referenceDate = '2026-10-27') {
  const [meta] = await db.select().from(demoMeta).limit(1)
  if (meta?.referenceDate === referenceDate) return
  await reseed({ referenceDate })
}
