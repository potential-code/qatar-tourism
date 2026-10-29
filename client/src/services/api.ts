import type { z } from 'zod'
import { ApiError } from '@/lib/api-error'
import { commit, db, newId } from '@/mocks/db'
import { type NewRow, withDefaults } from '@/mocks/defaults'
import type { Row, TableName } from '@/mocks/tables'
import { nowIso } from './clock'

/**
 * Mock API plumbing shared by every service (wep-mockup pattern): latency, errors, the demo
 * clock, the caller's identity and scope, and row helpers. A service is a set of async
 * functions that check access, read or write `db`, call `commit()` after a write, and return
 * `out(...)` copies so the UI can never mutate the database by accident.
 */

let latency = true

/** Turns simulated latency off (service tests) or back on. */
export function setLatency(enabled: boolean): void {
  latency = enabled
}

/** Simulated network latency (150–300 ms) so loading states still show. */
export function delay(ms = 150 + Math.random() * 150): Promise<void> {
  return latency ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

/** A deep copy for the caller: services never hand out live rows. */
export const out = <T>(value: T): T => structuredClone(value)

/**
 * Validates service input with a shared zod schema (formerly the `validate` middleware). A
 * failure is a 400 VALIDATION_ERROR with `details: { target, issues: [{ path, message }] }`.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown, target = 'json') {
  const result = schema.safeParse(input)
  if (result.success) return result.data as z.infer<S>
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
  throw ApiError.validation('Invalid request', { target, issues })
}

/** The first row matching `predicate`, or a 404 with `message`. */
export function findOr404<T>(rows: readonly T[], predicate: (row: T) => boolean, message: string) {
  const row = rows.find(predicate)
  if (!row) throw ApiError.notFound(message)
  return row
}

/** A Map from `key(row)` to row, for joins inside one service call. */
export function indexBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T> {
  return new Map(rows.map((row) => [key(row), row]))
}

/**
 * Inserts a row: a new UUID unless `id` is given, `createdAt`/`updatedAt` = demo now unless
 * given, and column defaults for anything left out. Returns the live row. Call `commit()` after.
 */
export function insertRow<T extends TableName>(
  table: T,
  values: Omit<NewRow<T>, 'id' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<NewRow<T>, Extract<'id' | 'createdAt' | 'updatedAt', keyof NewRow<T>>>>,
): Row<T> {
  const instant = nowIso()
  const row = withDefaults(table, {
    id: newId(),
    createdAt: instant,
    updatedAt: instant,
    ...values,
  } as unknown as NewRow<T>)
  ;(db[table] as Row<T>[]).push(row)
  return row
}

/** Applies `patch` to a live row and stamps `updatedAt` (when the table has it). */
export function updateRow<R extends object>(row: R, patch: Partial<R>): R {
  Object.assign(row, patch)
  if ('updatedAt' in row) Object.assign(row, { updatedAt: nowIso() })
  return row
}

export { pickVisibleLearnerFields } from '@shared/permissions'
export {
  addDays,
  DAY_MS,
  dayOffsetAt,
  daysBetween,
  formatQatarDateTime,
  QATAR_TIMEZONE,
  qatarInstant,
  todayInQatar,
} from '@shared/utils/qatar-calendar'
export { ApiError } from '@/lib/api-error'
export { anchorClock, now, nowIso, referenceDate } from './clock'
export {
  assertLearnerInScope,
  assertSessionInScope,
  assertSubmissionInScope,
  assignedLearnerIds,
  currentScope,
  type Scope,
} from './scope'
export {
  currentUser,
  requireCapability,
  requireRole,
  requireUser,
  type Viewer,
} from './session-context'
export { commit, db, newId }
