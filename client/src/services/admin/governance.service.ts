import {
  ACTIONS,
  EXPORT_BLOCKED_MESSAGE,
  LEARNER_FIELDS,
  PERMISSION_MATRIX,
  visibleLearnerFields,
} from '@shared/permissions'
import { ROLES } from '@shared/roles'
import {
  type AdminAuditExportQuery,
  type AdminAuditQuery,
  adminAuditExportQuery,
  adminAuditQuery,
} from '@shared/schemas/admin-governance'
import type { AuditEventRow } from '@shared/types/db'
import type { z } from 'zod'
import { commit, db, delay, now, nowIso, out, parseInput, requireRole } from '../api'
import { audit, byNewest } from '../audit.service'
import { buildCsv, csvFilename } from '../reports/csv'
import { type IntegrationEvidence, integrations } from './governance/integrations'

/**
 * Governance (brief §11, §14), formerly /api/admin/governance: hub counts, the roles and
 * permissions matrix, integration states and the audit trail with its CSV. Admin only.
 */

/** Live counts for the Academy Management hub. */
function hubCounts() {
  return {
    users: db.users.length,
    learners: db.users.filter((u) => u.role === 'learner').length,
    trainers: db.trainerProfiles.length,
    programmes: db.programmes.length,
    paths: db.learningPaths.length,
    courses: db.courses.length,
    sessions: db.sessions.length,
    assessments: db.assessments.length,
    auditEvents: db.auditEvents.length,
  }
}

/** Evidence behind each integration state: counted from the demo records, never asserted. */
function integrationEvidence(): IntegrationEvidence {
  const email = (state: string) =>
    db.notifications.filter((n) => n.channel === 'email' && n.state === state).length
  return {
    emailSimulated: email('simulated'),
    emailSent: email('sent'),
    emailQueued: email('queued'),
    emailFailed: email('failed'),
    onlineSessions: db.sessions.filter((s) => s.format === 'online' && s.meetingRef !== null)
      .length,
    inPersonSessions: db.sessions.filter((s) => s.format === 'in_person').length,
  }
}

export async function getHubOverview() {
  await delay()
  requireRole('admin')
  const list = integrations(integrationEvidence())
  return {
    counts: hubCounts(),
    roles: ROLES.length,
    integrations: { total: list.length, demo: list.filter((i) => i.state === 'Demo').length },
  }
}

/** The §11 matrix as data, plus field visibility per role. */
export async function getPermissions() {
  await delay()
  requireRole('admin')
  const briefRows = ACTIONS.slice(0, 9)
  return out({
    rows: ACTIONS.map((action) => ({
      action,
      fromBrief: briefRows.includes(action),
      ...PERMISSION_MATRIX[action],
    })),
    fields: ROLES.map((role) => ({ role, fields: visibleLearnerFields(role) })),
    fieldGroups: LEARNER_FIELDS,
    blockedExportMessage: EXPORT_BLOCKED_MESSAGE,
  })
}

export async function listIntegrations() {
  await delay()
  requireRole('admin')
  return { items: integrations(integrationEvidence()), checkedAt: nowIso() }
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
  outcome: row.outcome,
  createdAt: row.createdAt,
})

function matching(query: AdminAuditExportQuery): AuditEventRow[] {
  const term = query.search?.toLowerCase()
  const from = query.from ? Date.parse(query.from) : null
  const to = query.to ? Date.parse(query.to) : null
  const has = (value: string | null) => Boolean(term && value?.toLowerCase().includes(term))
  return db.auditEvents
    .filter((row) => {
      if (query.action && row.action !== query.action) return false
      if (query.objectType && row.objectType !== query.objectType) return false
      if (query.actorRole && row.actorRole !== query.actorRole) return false
      if (query.outcome && row.outcome !== query.outcome) return false
      const at = Date.parse(row.createdAt)
      if (from !== null && at < from) return false
      if (to !== null && at > to) return false
      if (
        term &&
        !has(row.action) &&
        !has(row.actorLabel) &&
        !has(row.objectId) &&
        !has(row.reason)
      )
        return false
      return true
    })
    .sort(byNewest)
}

/** Distinct values with counts, alphabetically (the filter selects). */
function facet(values: readonly string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, n]) => ({ value, n }))
}

/** One page of the audit trail, newest first, with action and object-type facets. */
export async function listAudit(input: Partial<z.input<typeof adminAuditQuery>> = {}) {
  await delay()
  requireRole('admin')
  const { page, pageSize, ...filters }: AdminAuditQuery = parseInput(
    adminAuditQuery,
    input,
    'query',
  )
  const rows = matching(filters)
  return out({
    items: rows.slice((page - 1) * pageSize, page * pageSize).map(view),
    total: rows.length,
    page,
    pageSize,
    facets: {
      actions: facet(db.auditEvents.map((e) => e.action)),
      objectTypes: facet(db.auditEvents.map((e) => e.objectType)),
    },
  })
}

/** The matching audit trail as CSV (addresses masked). The export itself is audited. */
export async function exportAuditCsv(input: Partial<z.input<typeof adminAuditExportQuery>> = {}) {
  await delay()
  requireRole('admin')
  const query = parseInput(adminAuditExportQuery, input, 'query')
  const rows = matching(query)
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
      row.createdAt,
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
  audit({
    action: 'export.report_csv',
    objectType: 'export',
    objectId: 'audit-log',
    after: {
      report: 'audit-log',
      format: 'csv',
      personalFields: false,
      rows: rows.length,
      filters,
    },
  })
  commit()
  return { csv, filename: csvFilename('audit log', now()), rows: rows.length }
}

export type HubOverview = Awaited<ReturnType<typeof getHubOverview>>
export type AuditPage = Awaited<ReturnType<typeof listAudit>>
