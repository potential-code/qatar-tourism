import type { auditEvents as auditTable } from '../schema'
import type { ActivityResult } from './activity'
import { stableUuid, userIds } from './ids'
import type { Calendar } from './reference-date'
import type { SessionsResult } from './sessions'
import { TRAINERS } from './trainers'

type AuditInsert = typeof auditTable.$inferInsert

/**
 * Audit rows that the seeded history implies (brief §11): certificate issuance, the session
 * reschedule and cancellation, one allowed and one denied export, a permission change and
 * administrator path overrides.
 */
export function buildSeedAudit(
  cal: Calendar,
  sessions: SessionsResult,
  activity: ActivityResult,
): AuditInsert[] {
  const rows: AuditInsert[] = []
  const trainer = (n: number) => TRAINERS.find((t) => t.n === n) as (typeof TRAINERS)[number]

  for (const cert of activity.certificateAudit) {
    rows.push({
      id: stableUuid('audit', `cert:${cert.code}`),
      actorId: null,
      actorRole: 'system',
      actorLabel: 'Certification check',
      action: 'certificate.issue',
      objectType: 'certificate',
      objectId: cert.code,
      before: null,
      after: { code: cert.code, status: 'issued' },
      reason: 'All Program A conditions verified',
      outcome: 'allowed',
      createdAt: cert.issuedAt,
    })
  }

  for (const hint of sessions.auditHints) {
    const t = TRAINERS.find((x) => x.userId === hint.trainerUserId) as (typeof TRAINERS)[number]
    rows.push({
      id: stableUuid('audit', `session:${hint.kind}:${hint.sessionId}`),
      actorId: hint.trainerUserId,
      actorRole: 'trainer',
      actorLabel: t.fullName,
      action: hint.kind === 'reschedule' ? 'session.reschedule' : 'session.cancel',
      objectType: 'session',
      objectId: hint.sessionId,
      before: hint.before,
      after: { ...hint.after, affectedRsvps: hint.affected },
      reason: hint.reason,
      outcome: 'allowed',
      createdAt: hint.at,
    })
  }

  rows.push(
    {
      id: stableUuid('audit', 'export-denied'),
      actorId: userIds.trainer(3),
      actorRole: 'trainer',
      actorLabel: trainer(3).fullName,
      action: 'export.learner_personal_data',
      objectType: 'export',
      objectId: 'learners',
      before: null,
      after: { report: 'learners', fields: ['email', 'mobile'] },
      reason: 'Role does not allow this export',
      outcome: 'denied',
      createdAt: cal.ago(6),
    },
    {
      id: stableUuid('audit', 'export-allowed'),
      actorId: userIds.admin,
      actorRole: 'admin',
      actorLabel: 'Academy Admin',
      action: 'export.report_csv',
      objectType: 'export',
      objectId: 'sessions-attendance',
      before: null,
      after: { report: 'sessions-attendance', format: 'csv', personalFields: false },
      reason: null,
      outcome: 'allowed',
      createdAt: cal.ago(5),
    },
    {
      id: stableUuid('audit', 'permission-change'),
      actorId: userIds.admin,
      actorRole: 'admin',
      actorLabel: 'Academy Admin',
      action: 'permission.change',
      objectType: 'trainer',
      objectId: trainer(10).code,
      before: { approvedProgrammes: ['A'] },
      after: { approvedProgrammes: ['A', 'B'] },
      reason: 'Aisha Rahman also marks the Program B short response',
      outcome: 'allowed',
      createdAt: cal.ago(40),
    },
  )

  for (const e of activity.enrolments.filter((x) => x.overrideReason)) {
    rows.push({
      id: stableUuid('audit', `override:${e.id}`),
      actorId: userIds.admin,
      actorRole: 'admin',
      actorLabel: 'Academy Admin',
      action: 'enrolment.path_override',
      objectType: 'enrolment',
      objectId: e.id as string,
      before: { path: 'B-GENERAL' },
      after: { path: 'B-HOTEL' },
      reason: e.overrideReason ?? null,
      outcome: 'allowed',
      createdAt: (e.lastActivityAt as Date | null) ?? cal.ago(10),
    })
  }
  return rows
}
