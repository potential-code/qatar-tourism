import type { AuditEventRow } from '@server/db/schema'
import { now } from '@server/lib/clock'
import type { Viewer } from '@server/middleware/auth.middleware'
import {
  ACTIONS,
  EXPORT_BLOCKED_MESSAGE,
  LEARNER_FIELDS,
  PERMISSION_MATRIX,
  visibleLearnerFields,
} from '@shared/permissions'
import { ROLES } from '@shared/roles'
import type { AdminAuditExportQuery, AdminAuditQuery } from '@shared/schemas/admin-governance'
import { buildCsv, csvFilename } from '../reports/reports.csv'
import { integrations } from './admin-governance.integrations'
import * as service from './admin-governance.service'

export async function overview() {
  const [counts, evidence] = await Promise.all([service.hubCounts(), service.integrationEvidence()])
  const list = integrations(evidence)
  return {
    counts,
    roles: ROLES.length,
    integrations: { total: list.length, demo: list.filter((i) => i.state === 'Demo').length },
  }
}

/** The §11 matrix as data, plus field visibility per role. */
export function permissions() {
  const briefRows = ACTIONS.slice(0, 9)
  return {
    rows: ACTIONS.map((action) => ({
      action,
      fromBrief: briefRows.includes(action),
      ...PERMISSION_MATRIX[action],
    })),
    fields: ROLES.map((role) => ({ role, fields: visibleLearnerFields(role) })),
    fieldGroups: LEARNER_FIELDS,
    blockedExportMessage: EXPORT_BLOCKED_MESSAGE,
  }
}

export async function integrationList() {
  return {
    items: integrations(await service.integrationEvidence()),
    checkedAt: now().toISOString(),
  }
}

const EMAIL = /[^\s"',;:]+@[^\s"',;:]+/g

/** Contact data never leaves in an audit export: anything shaped like an address is masked. */
const mask = (value: unknown) =>
  value === null || value === undefined ? null : JSON.stringify(value).replace(EMAIL, '[hidden]')

const view = (row: AuditEventRow) => ({
  id: row.id,
  actorLabel: row.actorLabel,
  actorRole: row.actorRole,
  action: row.action,
  objectType: row.objectType,
  objectId: row.objectId?.replace(EMAIL, '[hidden]') ?? null,
  before: row.before,
  after: row.after,
  reason: row.reason,
  outcome: row.outcome as 'allowed' | 'denied',
  createdAt: row.createdAt.toISOString(),
})

export async function auditPage(query: AdminAuditQuery) {
  const { page, pageSize, ...filters } = query
  const { items, total, facets } = await service.listAudit(filters, page, pageSize)
  return { items: items.map(view), total, page, pageSize, facets }
}

export async function auditCsv(viewer: Viewer, query: AdminAuditExportQuery, requestId?: string) {
  const rows = await service.allAudit(query)
  const csv = buildCsv(
    [
      'Timestamp (UTC)',
      'Actor',
      'Role',
      'Action',
      'Object type',
      'Object',
      'Outcome',
      'Reason',
      'Before',
      'After',
    ],
    rows.map((row) => [
      row.createdAt.toISOString(),
      row.actorLabel,
      row.actorRole,
      row.action,
      row.objectType,
      row.objectId?.replace(EMAIL, '[hidden]') ?? null,
      row.outcome,
      row.reason?.replace(EMAIL, '[hidden]') ?? null,
      mask(row.before),
      mask(row.after),
    ]),
  )
  const filters = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== ''),
  )
  await service.recordAuditExport(viewer, { rows: rows.length, filters }, requestId)
  return { csv, filename: csvFilename('audit log', now()), rows: rows.length }
}
