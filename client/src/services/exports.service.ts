import { PROGRAMME_CODES, type ProgrammeCode } from '@shared/constants'
import {
  type Action,
  accessFor,
  EXPORT_BLOCKED_MESSAGE,
  TRAINER_MARKS_EXPORT_FIELDS,
} from '@shared/permissions'
import type { Role } from '@shared/roles'
import { buildCsv, type CsvColumn, csvFilename } from '@shared/utils/csv'
import { z } from 'zod'
import {
  ApiError,
  assertSessionInScope,
  commit,
  currentScope,
  db,
  delay,
  now,
  parseInput,
  requireUser,
  type Viewer,
} from './api'
import { recordAudit } from './audit.service'

/**
 * CSV exports (brief §11, formerly the /api/exports module). Every attempt is audited: allowed
 * exports with the row count and the columns, blocked ones with `outcome: 'denied'`. The check
 * happens here, in the service, so a hidden button is never the only barrier. A denied attempt
 * is committed before the 403 is thrown, so the audit log keeps it.
 */

export type CsvExport = { filename: string; csv: string; rows: number }

/** The §11 blocked-export answer, verbatim. */
const exportBlocked = () => new ApiError(403, 'EXPORT_BLOCKED', EXPORT_BLOCKED_MESSAGE)

/**
 * Brief §11 export rows:
 *   personal data  learner no, trainer BLOCKED, admin permitted report scope
 *   marks          learner own, trainer learner ID and score only, admin authorised reports
 * Learners have no session-level export, so only trainer and admin reach a session export.
 */
export function exportAllowed(role: Role, kind: 'personal' | 'marks'): boolean {
  const action: Action = kind === 'personal' ? 'export.personal' : 'export.marks'
  if (role === 'learner') return false
  return accessFor(role, action) !== 'none'
}

function deny(actor: Viewer, action: string, objectId: string | null, why: string): never {
  recordAudit(actor, {
    action,
    objectType: 'export',
    objectId,
    outcome: 'denied',
    after: { role: actor.role },
    reason: why,
  })
  commit()
  throw exportBlocked()
}

function allow(
  actor: Viewer,
  action: string,
  objectId: string | null,
  rows: number,
  columns: string[],
) {
  recordAudit(actor, { action, objectType: 'export', objectId, after: { rows, columns } })
  commit()
}

/** Session scope for exports: a trainer outside their sessions is denied AND audited. */
function assertExportScope(actor: Viewer, action: string, sessionId: string) {
  try {
    assertSessionInScope(currentScope(), sessionId)
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      recordAudit(actor, {
        action,
        objectType: 'export',
        objectId: sessionId,
        outcome: 'denied',
        after: { role: actor.role },
        reason: 'Session outside the trainer scope',
      })
      commit()
    }
    throw error
  }
}

/** Confirmed learners of a session with their attendance and score, by learner ID. */
function sessionRows(sessionId: string) {
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const organisations = new Map(db.organisations.map((o) => [o.id, o]))
  const attendance = new Map(db.attendance.map((a) => [a.rsvpId, a.status]))
  const scores = new Map(db.sessionScores.map((s) => [s.rsvpId, s]))
  return db.rsvps
    .filter((r) => r.sessionId === sessionId && r.status === 'confirmed')
    .map((r) => {
      const profile = profiles.get(r.learnerId)
      const organisation = profile?.organisationId
        ? organisations.get(profile.organisationId)
        : undefined
      const score = scores.get(r.id)
      return {
        learnerCode: profile?.learnerCode ?? null,
        displayName: profile?.fullName ?? null,
        organisationName: organisation?.name ?? null,
        jobTitle: profile?.jobTitle ?? null,
        seniority: profile?.seniority ?? null,
        city: profile?.city ?? null,
        attendance: attendance.get(r.id) ?? null,
        score: score?.total ?? null,
        scoreStatus: score?.status ?? null,
      }
    })
    .sort((a, b) => (a.learnerCode ?? '').localeCompare(b.learnerCode ?? ''))
}

type SessionExportRow = ReturnType<typeof sessionRows>[number]

function sessionCode(sessionId: string): string {
  const session = db.sessions.find((s) => s.id === sessionId)
  if (!session) throw ApiError.notFound('Session not found')
  return session.code
}

const sessionIdInput = z.uuid()

/**
 * Marks export. A trainer gets exactly the learner ID and the final score (brief §11:
 * "Optional learner ID and score only"); draft scores are left blank.
 */
export async function exportSessionMarks(sessionId: string): Promise<CsvExport> {
  await delay()
  const actor = requireUser()
  parseInput(sessionIdInput, sessionId, 'param')
  const action = 'export.marks'
  if (!exportAllowed(actor.role, 'marks')) {
    deny(actor, action, sessionId, 'Role has no session marks export')
  }
  assertExportScope(actor, action, sessionId)
  const code = sessionCode(sessionId)
  const rows = sessionRows(sessionId)
  const columns: CsvColumn<SessionExportRow>[] = [
    { header: 'Learner ID', value: (r) => r.learnerCode },
    { header: 'Score', value: (r) => (r.scoreStatus === 'final' ? r.score : null) },
  ]
  allow(actor, action, sessionId, rows.length, [...TRAINER_MARKS_EXPORT_FIELDS])
  return {
    filename: csvFilename(`${code}-marks`, now()),
    csv: buildCsv(columns, rows),
    rows: rows.length,
  }
}

/** Personal-data export of a session roster. Blocked for trainers and learners. */
export async function exportSessionPersonal(sessionId: string): Promise<CsvExport> {
  await delay()
  const actor = requireUser()
  parseInput(sessionIdInput, sessionId, 'param')
  const action = 'export.personal'
  if (!exportAllowed(actor.role, 'personal')) {
    deny(actor, action, sessionId, 'Role does not allow personal-data export')
  }
  assertExportScope(actor, action, sessionId)
  const code = sessionCode(sessionId)
  const rows = sessionRows(sessionId)
  const columns: CsvColumn<SessionExportRow>[] = [
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
  allow(
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
 * Admin-scoped learner export for reports: permitted report fields only, never email or phone.
 * Trainers and learners are denied and audited.
 */
export async function exportProgrammeLearners(programme: ProgrammeCode): Promise<CsvExport> {
  await delay()
  const actor = requireUser()
  const code = parseInput(z.enum(PROGRAMME_CODES), programme, 'query')
  const action = 'export.personal'
  if (actor.role !== 'admin') {
    deny(actor, action, `programme:${code}`, 'Academy-wide export is admin only')
  }
  const programmeRow = db.programmes.find((p) => p.code === code)
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const organisations = new Map(db.organisations.map((o) => [o.id, o]))
  const rows = db.enrolments
    .filter((e) => e.programmeId === programmeRow?.id)
    .flatMap((e) => {
      const profile = profiles.get(e.learnerId)
      if (!profile) return []
      const organisation = profile.organisationId
        ? organisations.get(profile.organisationId)
        : undefined
      return [
        {
          learnerCode: profile.learnerCode,
          displayName: profile.fullName,
          organisationName: organisation?.name ?? null,
          organisationType: organisation?.type ?? null,
          jobTitle: profile.jobTitle,
          seniority: profile.seniority,
          status: e.status,
          progress: e.progressPercent,
          stage: e.currentStage,
        },
      ]
    })
    .sort((a, b) => a.learnerCode.localeCompare(b.learnerCode))
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
  allow(
    actor,
    action,
    `programme:${code}`,
    rows.length,
    columns.map((c) => c.header),
  )
  return {
    filename: csvFilename(`program-${code}-learners`, now()),
    csv: buildCsv(columns, rows),
    rows: rows.length,
  }
}
