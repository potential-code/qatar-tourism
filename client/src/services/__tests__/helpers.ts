import { createDemoDb, type DemoDb, replaceDb } from '@/mocks/db'
import { anchorClock, setLatency } from '../api'

/** The reference date every service test uses (the seed's documented tables are dated to it). */
export const TEST_REFERENCE_DATE = '2026-10-27'

let seeded: DemoDb | null = null

/**
 * Installs a freshly seeded database (in memory, no IndexedDB) with latency off and the demo
 * clock restarted. The seed is built once per test file and deep-copied for every call, so
 * each test starts from the same state. Returns the live database.
 */
export function freshDemo(): DemoDb {
  setLatency(false)
  seeded ??= createDemoDb(TEST_REFERENCE_DATE)
  const db = replaceDb(structuredClone(seeded))
  anchorClock()
  return db
}

/** Signs in as `userId` directly (no password check), as the old `stubSession` helper did. */
export function actAs(db: DemoDb, userId: string | null): void {
  db.session = userId ? { userId, facilitatorId: null } : null
}
