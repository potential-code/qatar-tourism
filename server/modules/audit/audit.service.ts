import { db } from '@server/db/connection'
import { auditEvents } from '@server/db/schema'
import { now } from '@server/lib/clock'
import type { AuthEnv, Viewer } from '@server/middleware/auth.middleware'
import type { auditQuery } from '@shared/schemas'
import { and, count, desc, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import type { z } from 'zod'

/** Anything that can run an insert: the pooled db or a transaction. */
type Executor = Pick<typeof db, 'insert'>

export type AuditInput = {
  /** Dot-separated verb, e.g. 'session.reschedule', 'marking.finalise', 'export.denied'. */
  action: string
  objectType: string
  objectId?: string | null
  /** Short summaries, not full rows: never put personal data or secrets here. */
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  reason?: string | null
  /** 'denied' records a blocked attempt, e.g. a trainer's personal-data export (brief §11). */
  outcome?: 'allowed' | 'denied'
}

type Actor = Pick<Viewer, 'id' | 'role' | 'name'>

/**
 * Appends an audit event for the signed-in viewer (brief §11: actor, role, timestamp, object,
 * action, before/after summary, reason). Services call this inside the same transaction as the
 * change it describes, passing `executor` (the transaction):
 *
 *   await audit(c, { action: 'session.cancel', objectType: 'session', objectId: id,
 *                    before: { status: 'published' }, after: { status: 'cancelled' },
 *                    reason }, tx)
 *
 * Needs a request context with `requireAuth` applied. Outside a request (seed, jobs) use
 * `recordAudit` with an explicit actor.
 */
export async function audit(c: Context<AuthEnv>, input: AuditInput, executor: Executor = db) {
  const requestId = c.get('requestId' as never) as string | undefined
  await recordAudit(c.var.viewer, input, executor, requestId)
}

export async function recordAudit(
  actor: Actor | null,
  input: AuditInput,
  executor: Executor = db,
  requestId?: string,
) {
  await executor.insert(auditEvents).values({
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? 'system',
    actorLabel: actor?.name ?? null,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    reason: input.reason ?? null,
    outcome: input.outcome ?? 'allowed',
    requestId: requestId ?? null,
    createdAt: now(),
  })
}

export async function listAuditEvents(query: z.infer<typeof auditQuery>) {
  const where = and(
    query.action ? eq(auditEvents.action, query.action) : undefined,
    query.objectType ? eq(auditEvents.objectType, query.objectType) : undefined,
    query.actorId ? eq(auditEvents.actorId, query.actorId) : undefined,
  )
  const [items, totals] = await Promise.all([
    db
      .select()
      .from(auditEvents)
      .where(where)
      .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(auditEvents).where(where),
  ])
  return { items, total: totals[0]?.total ?? 0 }
}
