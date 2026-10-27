import { db } from '@server/db/connection'
import {
  assessments,
  auditEvents,
  courses,
  learningPaths,
  notifications,
  programmes,
  sessions,
  trainerProfiles,
  user,
} from '@server/db/schema'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { AdminAuditExportQuery } from '@shared/schemas/admin-governance'
import { and, count, desc, eq, gte, ilike, isNotNull, lte, or } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'

const one = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0

/** Live counts for the Academy Management hub. */
export async function hubCounts() {
  const [
    users,
    learners,
    trainers,
    progs,
    paths,
    courseCount,
    sessionCount,
    assessmentCount,
    audit,
  ] = await Promise.all([
    one(db.select({ n: count() }).from(user)),
    one(db.select({ n: count() }).from(user).where(eq(user.role, 'learner'))),
    one(db.select({ n: count() }).from(trainerProfiles)),
    one(db.select({ n: count() }).from(programmes)),
    one(db.select({ n: count() }).from(learningPaths)),
    one(db.select({ n: count() }).from(courses)),
    one(db.select({ n: count() }).from(sessions)),
    one(db.select({ n: count() }).from(assessments)),
    one(db.select({ n: count() }).from(auditEvents)),
  ])
  return {
    users,
    learners,
    trainers,
    programmes: progs,
    paths,
    courses: courseCount,
    sessions: sessionCount,
    assessments: assessmentCount,
    auditEvents: audit,
  }
}

/** Evidence behind each integration state: counted from the demo records, never asserted. */
export async function integrationEvidence() {
  const [emailRows, onlineSessions, inPersonSessions] = await Promise.all([
    db
      .select({ state: notifications.state, n: count() })
      .from(notifications)
      .where(eq(notifications.channel, 'email'))
      .groupBy(notifications.state),
    one(
      db
        .select({ n: count() })
        .from(sessions)
        .where(and(eq(sessions.format, 'online'), isNotNull(sessions.meetingRef))),
    ),
    one(db.select({ n: count() }).from(sessions).where(eq(sessions.format, 'in_person'))),
  ])
  const emails = Object.fromEntries(emailRows.map((row) => [row.state, row.n])) as Record<
    string,
    number
  >
  return {
    emailSimulated: emails.simulated ?? 0,
    emailSent: emails.sent ?? 0,
    emailQueued: emails.queued ?? 0,
    emailFailed: emails.failed ?? 0,
    onlineSessions,
    inPersonSessions,
  }
}

function auditWhere(query: AdminAuditExportQuery) {
  const term = query.search ? `%${query.search}%` : null
  return and(
    query.action ? eq(auditEvents.action, query.action) : undefined,
    query.objectType ? eq(auditEvents.objectType, query.objectType) : undefined,
    query.actorRole ? eq(auditEvents.actorRole, query.actorRole) : undefined,
    query.outcome ? eq(auditEvents.outcome, query.outcome) : undefined,
    query.from ? gte(auditEvents.createdAt, new Date(query.from)) : undefined,
    query.to ? lte(auditEvents.createdAt, new Date(query.to)) : undefined,
    term
      ? or(
          ilike(auditEvents.action, term),
          ilike(auditEvents.actorLabel, term),
          ilike(auditEvents.objectId, term),
          ilike(auditEvents.reason, term),
        )
      : undefined,
  )
}

export async function listAudit(query: AdminAuditExportQuery, page: number, pageSize: number) {
  const where = auditWhere(query)
  const [items, totals, actions, objectTypes] = await Promise.all([
    db
      .select()
      .from(auditEvents)
      .where(where)
      .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(auditEvents).where(where),
    db
      .select({ value: auditEvents.action, n: count() })
      .from(auditEvents)
      .groupBy(auditEvents.action)
      .orderBy(auditEvents.action),
    db
      .select({ value: auditEvents.objectType, n: count() })
      .from(auditEvents)
      .groupBy(auditEvents.objectType)
      .orderBy(auditEvents.objectType),
  ])
  return { items, total: totals[0]?.n ?? 0, facets: { actions, objectTypes } }
}

export async function allAudit(query: AdminAuditExportQuery) {
  return db
    .select()
    .from(auditEvents)
    .where(auditWhere(query))
    .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
}

export async function recordAuditExport(
  viewer: Viewer,
  summary: Record<string, unknown>,
  requestId?: string,
) {
  await recordAudit(
    viewer,
    {
      action: 'export.report_csv',
      objectType: 'export',
      objectId: 'audit-log',
      after: { report: 'audit-log', format: 'csv', personalFields: false, ...summary },
    },
    db,
    requestId,
  )
}
