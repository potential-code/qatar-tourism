import type { DemoMetaView } from '@shared/schemas'
import { resetDemo } from '@/mocks/db'
import { anchorClock, commit, db, delay, nowIso, requireRole, requireUser } from './api'
import { audit } from './audit.service'

/** The demo snapshot: its metadata, and the administrator's reset (brief §17). */

function metaView(): DemoMetaView {
  return {
    referenceDate: db.meta.referenceDate,
    seedVersion: db.meta.seedVersion,
    seededAt: db.meta.seededAt,
    now: nowIso(),
    counts: { ...db.meta.counts },
  }
}

/** Reference date, seed version and counts of the current snapshot. Any signed-in user. */
export async function getDemoMeta(): Promise<DemoMetaView> {
  await delay()
  requireUser()
  return metaView()
}

/**
 * Restores the deterministic snapshot: rebuilds every collection from the seed, empties
 * uploaded demo files, restarts the demo clock and keeps the administrator signed in. Admin
 * only. Audited after the rebuild, since the old audit trail is part of what a reset replaces.
 */
export async function resetDemoData() {
  await delay(400)
  requireRole('admin')
  await resetDemo()
  anchorClock()
  const meta = metaView()
  audit({
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
  commit()
  return {
    message:
      'Demo data has been reset to the snapshot. All learner and training data is fictional.',
    resetAt: meta.now,
    meta,
  }
}
