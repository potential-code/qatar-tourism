import type { DemoMetaRow, DemoSettings } from '@shared/types/db'
import { clearUploads, pruneSnapshots, readSnapshot, writeSnapshot } from './persist'
import { buildSeed } from './seed'
import { seedReferenceDate } from './seed/reference-date'
import type { DemoCollections } from './tables'

/**
 * The demo's in-memory database: every table of the old Postgres schema as a plain array, plus
 * the signed-in session. Built from the deterministic seed, saved to IndexedDB after each write
 * (`commit`), so state survives reloads and role switches. `resetDemo` restores the seed.
 *
 * ONLY services import this module (routes → features → queries → services → mocks).
 */

export interface DemoSession {
  userId: string
  /** The demo administrator behind a facilitator quick switch; null for an ordinary sign-in. */
  facilitatorId: string | null
}

export interface DemoDb extends DemoCollections {
  /** Snapshot format version; a mismatch on load reseeds. */
  version: number
  session: DemoSession | null
  meta: DemoMetaRow
  /** Configurable thresholds (offer window, validity, CPD target, reminders). */
  settings: DemoSettings
  /** Passwords chosen at registration, by user id. Seeded accounts use DEMO_PASSWORD. */
  passwords: Record<string, string>
}

/** Bump when the DemoDb shape or the seed recipe changes: saved snapshots are then rebuilt. */
export const DB_VERSION = 4
const SNAPSHOT_KEY = `qta-demo-db:v${DB_VERSION}`
const SAVE_DELAY_MS = 250

/** A fresh database from the seed for `referenceDate`. Used by load, reset and tests. */
export function createDemoDb(referenceDate = seedReferenceDate()): DemoDb {
  return { version: DB_VERSION, session: null, passwords: {}, ...buildSeed(referenceDate) }
}

/**
 * The live database. Filled by `loadDb()` before the first render (or `replaceDb()` in tests);
 * the object identity never changes, so modules may hold on to it.
 */
export const db = {} as DemoDb

/** Swaps the whole contents in place (load, reset, tests). */
export function replaceDb(next: DemoDb): DemoDb {
  for (const key of Object.keys(db)) delete (db as unknown as Record<string, unknown>)[key]
  return Object.assign(db, next)
}

function usable(saved: DemoDb | null, referenceDate: string): saved is DemoDb {
  return saved?.version === DB_VERSION && saved.meta?.referenceDate === referenceDate
}

/** Loads the saved snapshot, or seeds a new one. Call once, before the app renders. */
export async function loadDb(): Promise<DemoDb> {
  const referenceDate = seedReferenceDate()
  const saved = await readSnapshot<DemoDb>(SNAPSHOT_KEY)
  if (usable(saved, referenceDate)) return replaceDb(saved)
  replaceDb(createDemoDb(referenceDate))
  await save()
  await pruneSnapshots(SNAPSHOT_KEY)
  return db
}

let pending: ReturnType<typeof setTimeout> | undefined

async function save(): Promise<void> {
  clearTimeout(pending)
  pending = undefined
  await writeSnapshot(SNAPSHOT_KEY, db)
}

/** Persists after a write. Debounced, so a burst of changes is saved once. */
export function commit(): void {
  clearTimeout(pending)
  pending = setTimeout(() => void save(), SAVE_DELAY_MS)
}

/** Writes a pending change now (the page is being hidden or closed). */
export function flush(): Promise<void> {
  return pending ? save() : Promise.resolve()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flush())
}

/** Restores the seed and empties uploaded files. Keeps the session, so the presenter stays in. */
export async function resetDemo(): Promise<DemoDb> {
  const session = db.session
  replaceDb({ ...createDemoDb(db.meta?.referenceDate ?? seedReferenceDate()), session })
  await clearUploads()
  await save()
  return db
}

/** UUID v4 from `crypto.getRandomValues`, which works outside secure contexts too. */
function uuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * A new identifier. Without a prefix it is a UUID: use that for row ids (the shared zod
 * schemas validate them with `z.uuid()`). With a prefix it is `<prefix>-<uuid>`, for text ids
 * such as notification event ids (`newId('evt')`) or new account ids (`newId('user')`).
 */
export function newId(prefix?: string): string {
  return prefix ? `${prefix}-${uuid()}` : uuid()
}
