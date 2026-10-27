import type { AuditEventRow } from '@server/db/schema'
import type { auditQuery } from '@shared/schemas'
import type { z } from 'zod'
import * as auditService from './audit.service'

export function toAuditView(row: AuditEventRow) {
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
    outcome: row.outcome as 'allowed' | 'denied',
    createdAt: row.createdAt.toISOString(),
  }
}

export async function listAudit(query: z.infer<typeof auditQuery>) {
  const { items, total } = await auditService.listAuditEvents(query)
  return { items: items.map(toAuditView), total, page: query.page, pageSize: query.pageSize }
}
