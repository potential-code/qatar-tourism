import { db } from '@server/db/connection'
import { profiles } from '@server/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Whether an account is suspended (admin user management). Read by Better Auth's session hook,
 * so a suspended learner cannot start a new session: suspension is a block, not only a
 * sign-out.
 */
export async function isSuspended(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ suspended: profiles.suspended })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)
  return row?.suspended === true
}
