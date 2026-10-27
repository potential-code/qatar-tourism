import { db } from '@server/db/connection'
import { demoMeta } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { now, setClockState } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { logger } from '@server/lib/logger'
import type { AuthEnv } from '@server/middleware/auth.middleware'
import type { Context } from 'hono'
import { audit } from '../audit/audit.service'

export async function getDemoMeta() {
  const [meta] = await db.select().from(demoMeta).limit(1)
  if (!meta)
    throw new HttpError(
      404,
      'NOT_SEEDED',
      'The demo data has not been seeded. Run bun run db:seed.',
    )
  return meta
}

/** Loads the demo clock from the stored snapshot. Called at server start and every 15 s. */
export async function loadClock() {
  const [meta] = await db.select().from(demoMeta).limit(1)
  if (!meta) {
    setClockState(null)
    return null
  }
  setClockState({ referenceDate: meta.referenceDate, anchoredAt: meta.anchoredAt })
  return meta.referenceDate
}

/**
 * Restores the deterministic snapshot: truncates every table, re-runs the seed and keeps the
 * calling administrator's session alive. Audited (the event is written after the re-seed,
 * since the old audit trail is part of what a reset replaces).
 */
export async function resetDemo(c: Context<AuthEnv>) {
  const viewer = c.var.viewer
  try {
    await reseed({ keepSessionsOf: viewer.id })
  } catch (error) {
    logger.error({ err: error }, 'Demo reset failed')
    throw new HttpError(
      500,
      'RESET_FAILED',
      'The demo data could not be reset. Nothing was changed.',
    )
  }
  const meta = await getDemoMeta()
  await audit(c, {
    action: 'demo.reset',
    objectType: 'demo',
    objectId: 'snapshot',
    after: {
      referenceDate: meta.referenceDate,
      seedVersion: meta.seedVersion,
      counts: meta.counts,
    },
    reason: 'Administrator restored the demonstration snapshot',
  })
  return { meta, resetAt: now() }
}
