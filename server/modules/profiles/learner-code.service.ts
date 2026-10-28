import type { db } from '@server/db/connection'
import { profiles } from '@server/db/schema'
import { sql } from 'drizzle-orm'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Next free learner code (L1201, L1202, …) after the seeded L0001–L1200, for public
 * registration and admin-created learners alike. The advisory lock holds until the caller's
 * transaction ends, so two registrations at the same moment cannot both take max+1 (the second
 * would hit the unique code and leave an account without a profile). Call inside a transaction.
 */
export async function nextLearnerCode(tx: Tx): Promise<string> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('profiles.learner_code'))`)
  const [row] = await tx
    .select({
      max: sql<number>`coalesce(max(substring(${profiles.learnerCode} from 2)::int), 0)::int`,
    })
    .from(profiles)
  return `L${String((row?.max ?? 0) + 1).padStart(4, '0')}`
}
