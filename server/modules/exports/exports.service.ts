import { db } from '@server/db/connection'
import {
  attendance,
  enrolments,
  organisations,
  profiles,
  programmes,
  rsvps,
  sessionScores,
  sessions,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { assertSessionInScope, resolveScope } from '@server/middleware/scope.middleware'
import type { ProgrammeCode } from '@shared/constants'
import { TRAINER_MARKS_EXPORT_FIELDS } from '@shared/permissions'
import { buildCsv, type CsvColumn, csvFilename } from '@shared/utils/csv'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import type { Actor } from '../sessions/actor'
import { exportAllowed, exportBlocked } from './exports.policy'

/**
 * CSV exports (brief §11). Every attempt is audited: allowed exports with the row count and the
 * columns, blocked ones with `outcome: 'denied'`. The check happens here, in the API, so a
 * hidden button is never the only barrier.
 */

export type CsvExport = { filename: string; csv: string; rows: number }

async function deny(actor: Actor, action: string, objectId: string | null, why: string) {
  await recordAudit(
    actor,
    {
      action,
      objectType: 'export',
      objectId,
      outcome: 'denied',
      after: { role: actor.role },
      reason: why,
    },
    db,
    actor.requestId,
  )
}

async function allow(
  actor: Actor,
  action: string,
  objectId: string | null,
  rows: number,
  columns: string[],
) {
  await recordAudit(
    actor,
    { action, objectType: 'export', objectId, after: { rows, columns } },
    db,
    actor.requestId,
  )
}

/** Session scope for exports: a trainer outside their sessions is denied AND audited. */
async function assertExportScope(actor: Actor, action: string, sessionId: string) {
  const scope = await resolveScope({ ...actor, email: '' })
  try {
    await assertSessionInScope(scope, sessionId)
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) {
      await deny(actor, action, sessionId, 'Session outside the trainer scope')
    }
    throw error
  }
}

async function sessionRows(sessionId: string) {
  return db
    .select({
      learnerCode: profiles.learnerCode,
      displayName: profiles.fullName,
      organisationName: organisations.name,
      jobTitle: profiles.jobTitle,
      seniority: profiles.seniority,
      city: profiles.city,
      rsvpStatus: rsvps.status,
      attendance: attendance.status,
      score: sessionScores.total,
      scoreStatus: sessionScores.status,
    })
    .from(rsvps)
    .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
    .leftJoin(sessionScores, eq(sessionScores.rsvpId, rsvps.id))
    .where(and(eq(rsvps.sessionId, sessionId), eq(rsvps.status, 'confirmed')))
    .orderBy(asc(profiles.learnerCode))
}

async function sessionCode(sessionId: string) {
  const [row] = await db
    .select({ code: sessions.code })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
  if (!row) throw HttpError.notFound('Session not found')
  return row.code
}

/**
 * Marks export. A trainer gets exactly the learner ID and the final score (brief §11:
 * "Optional learner ID and score only"); draft scores are left blank.
 */
export async function exportSessionMarks(actor: Actor, sessionId: string): Promise<CsvExport> {
  const action = 'export.marks'
  if (!exportAllowed(actor.role, 'marks')) {
    await deny(actor, action, sessionId, 'Role has no session marks export')
    throw exportBlocked()
  }
  await assertExportScope(actor, action, sessionId)
  const code = await sessionCode(sessionId)
  const rows = await sessionRows(sessionId)
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: 'Learner ID', value: (r) => r.learnerCode },
    { header: 'Score', value: (r) => (r.scoreStatus === 'final' ? r.score : null) },
  ]
  await allow(actor, action, sessionId, rows.length, [...TRAINER_MARKS_EXPORT_FIELDS])
  return {
    filename: csvFilename(`${code}-marks`, now()),
    csv: buildCsv(columns, rows),
    rows: rows.length,
  }
}

/** Personal-data export of a session roster. Blocked for trainers and learners. */
export async function exportSessionPersonal(actor: Actor, sessionId: string): Promise<CsvExport> {
  const action = 'export.personal'
  if (!exportAllowed(actor.role, 'personal')) {
    await deny(actor, action, sessionId, 'Role does not allow personal-data export')
    throw exportBlocked()
  }
  await assertExportScope(actor, action, sessionId)
  const code = await sessionCode(sessionId)
  const rows = await sessionRows(sessionId)
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: 'Learner ID', value: (r) => r.learnerCode },
    { header: 'Display name', value: (r) => r.displayName },
    { header: 'Organisation', value: (r) => r.organisationName },
    { header: 'Job title', value: (r) => r.jobTitle },
    { header: 'Seniority', value: (r) => r.seniority },
    { header: 'City', value: (r) => r.city },
    { header: 'Attendance', value: (r) => r.attendance ?? 'pending' },
    { header: 'Score', value: (r) => r.score },
    { header: 'Score status', value: (r) => r.scoreStatus },
  ]
  await allow(
    actor,
    action,
    sessionId,
    rows.length,
    columns.map((c) => c.header),
  )
  return {
    filename: csvFilename(`${code}-roster`, now()),
    csv: buildCsv(columns, rows),
    rows: rows.length,
  }
}

/**
 * Admin-scoped learner export for reports (Agent E): permitted report fields only, never
 * email or phone. Trainers and learners are denied and audited.
 */
export async function exportProgrammeLearners(
  actor: Actor,
  programme: ProgrammeCode,
): Promise<CsvExport> {
  const action = 'export.personal'
  if (actor.role !== 'admin') {
    await deny(actor, action, `programme:${programme}`, 'Academy-wide export is admin only')
    throw exportBlocked()
  }
  const rows = await db
    .select({
      learnerCode: profiles.learnerCode,
      displayName: profiles.fullName,
      organisationName: organisations.name,
      organisationType: organisations.type,
      jobTitle: profiles.jobTitle,
      seniority: profiles.seniority,
      status: enrolments.status,
      progress: enrolments.progressPercent,
      stage: enrolments.currentStage,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .innerJoin(profiles, eq(profiles.userId, enrolments.learnerId))
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .where(inArray(programmes.code, [programme]))
    .orderBy(asc(profiles.learnerCode))
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { header: 'Learner ID', value: (r) => r.learnerCode },
    { header: 'Display name', value: (r) => r.displayName },
    { header: 'Organisation', value: (r) => r.organisationName },
    { header: 'Organisation type', value: (r) => r.organisationType },
    { header: 'Job title', value: (r) => r.jobTitle },
    { header: 'Seniority', value: (r) => r.seniority },
    { header: 'Status', value: (r) => r.status },
    { header: 'Progress percent', value: (r) => r.progress },
    { header: 'Current stage', value: (r) => r.stage },
  ]
  await allow(
    actor,
    action,
    `programme:${programme}`,
    rows.length,
    columns.map((c) => c.header),
  )
  return {
    filename: csvFilename(`program-${programme}-learners`, now()),
    csv: buildCsv(columns, rows),
    rows: rows.length,
  }
}
