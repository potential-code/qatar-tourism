import type { AuditEventView, auditQuery } from '@shared/schemas'
import type { AuditEventRow } from '@shared/types/db'
import type { z } from 'zod'
import { currentUser, db, delay, insertRow, nowIso, out, requireRole, type Viewer } from './api'

/**
 * Audit trail (brief §11): actor, role, timestamp, object, action, before/after summary and
 * reason. Append-only. Shared seam: every service that changes something audits it here.
 */

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

export type AuditActor = Pick<Viewer, 'id' | 'role' | 'name'>

/**
 * Appends an audit event for an explicit actor; `null` records the system (e.g. an automatic
 * certificate issue). Synchronous: call it next to the change, before `commit()`.
 */
export function recordAudit(actor: AuditActor | null, input: AuditInput): AuditEventRow {
  return insertRow('auditEvents', {
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
    requestId: null,
    createdAt: nowIso(),
  })
}

/** Appends an audit event for the signed-in user (the system when nobody is signed in). */
export function audit(input: AuditInput): AuditEventRow {
  return recordAudit(currentUser(), input)
}

export function toAuditView(row: AuditEventRow): AuditEventView {
  return {
    id: row.id,
    actorId: row.actorId,
    actorRole: row.actorRole,
    actorLabel: row.actorLabel,
    action: row.action,
    objectType: row.objectType,
    objectId: row.objectId,
    before: row.before,
    after: row.after,
    reason: row.reason,
    outcome: row.outcome,
    createdAt: row.createdAt,
  }
}

/** Newest first, ties broken by id (as the old `order by created_at desc, id desc`). */
export function byNewest(a: AuditEventRow, b: AuditEventRow): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
}

/** Audit events matching the query (admin only), newest first, one page at a time. */
export async function listAuditEvents(query: Partial<z.infer<typeof auditQuery>> = {}) {
  await delay()
  requireRole('admin')
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 25
  const rows = db.auditEvents
    .filter(
      (row) =>
        (!query.action || row.action === query.action) &&
        (!query.objectType || row.objectType === query.objectType) &&
        (!query.actorId || row.actorId === query.actorId),
    )
    .sort(byNewest)
  return out({
    items: rows.slice((page - 1) * pageSize, page * pageSize).map(toAuditView),
    total: rows.length,
    page,
    pageSize,
  })
}
