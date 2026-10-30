import type { DemoMetaRow, DemoSettings } from '@shared/types/db'
import type { DemoCollections } from '../tables'
import { buildOrganisationRows, buildProfiles, buildTrainerRows, buildUsers } from './accounts'
import { buildActivity } from './activity'
import { buildApprovals } from './approvals'
import { buildSeedAudit } from './audit-events'
import { pickCast } from './cast'
import { buildCatalogue } from './catalogue'
import { buildCredentials } from './credentials'
import { stableUuid, userIds } from './ids'
import {
  buildContentPackages,
  buildCrmEvents,
  buildCrmMappings,
  buildIntegrationSettings,
  buildXapiStatements,
} from './integrations'
import { buildLearners } from './learners'
import { buildOrganisations } from './organisations'
import { buildPlan } from './plan'
import { buildAssessmentRules, buildQuestionBank } from './question-bank'
import { calendar, SEED_VERSION } from './reference-date'
import { Rng } from './rng'
import { toRows } from './rows'
import { buildSessions } from './sessions'
import { DEFAULT_DEMO_SETTINGS } from './settings'

/**
 * Deterministic demo dataset (brief §15–17), ported from server/db/seed. The same reference date
 * always produces the same rows and IDs, so a reset reproduces the same charts.
 *
 * Order: organisations and catalogue, learners, the enrolment plan, sessions (RSVPs, attendance,
 * scores), per-enrolment activity, then accounts and audit rows derived from all of it.
 */

export const SEED_ROOT = 'qta-demo-v1'

export type Seed = DemoCollections & { meta: DemoMetaRow; settings: DemoSettings }

/** Builds every collection for `referenceDate` (YYYY-MM-DD). `seededAt` is stamped on `meta`. */
export function buildSeed(referenceDate: string, seededAt: Date = new Date()): Seed {
  const rng = new Rng(SEED_ROOT)
  const cal = calendar(referenceDate)

  const organisationSeeds = buildOrganisations()
  const catalogue = buildCatalogue(cal)
  const learners = buildLearners(rng, organisationSeeds)
  const plan = buildPlan(rng, learners)
  const sessions = buildSessions(rng, cal, plan, catalogue.ids.programme)
  const activity = buildActivity(rng, cal, catalogue, plan, learners, sessions)
  const users = buildUsers(learners, activity.learnerDates, cal)
  const trainer = buildTrainerRows(catalogue.ids.programme, cal)
  const profiles = buildProfiles(rng, learners, activity.learnerDates)

  // 29 Oct update: credentials, approvals, account lock, question bank, content, CRM.
  const cast = pickCast(learners, plan, activity)
  const programmeA = catalogue.ids.programme.A
  const credentials = buildCredentials(cal, activity, cast, programmeA)
  const approvals = buildApprovals(cal, cast, programmeA, {
    mariam: credentials.ids.externalMariam,
    pending: credentials.ids.externalPending,
  })
  const lockedAt = cal.ago(2)
  const lockedProfile = profiles.find((p) => p.userId === cast.locked.userId)
  if (!lockedProfile) throw new Error('Seed cast: locked learner has no profile')
  lockedProfile.accountStatus = 'locked'
  lockedProfile.lockReason = 'Repeated failed sign-in attempts (simulated)'
  lockedProfile.lockedAt = lockedAt
  lockedProfile.lockedBy = userIds.admin
  const audit = [
    ...buildSeedAudit(cal, sessions, activity),
    ...credentials.audit,
    ...approvals.audit,
    {
      id: stableUuid('audit', `account-lock:${cast.locked.code}`),
      actorId: userIds.admin,
      actorRole: 'admin',
      actorLabel: 'Academy Admin',
      action: 'account.lock',
      objectType: 'user',
      objectId: cast.locked.userId,
      before: { accountStatus: 'active' },
      after: { accountStatus: 'locked', sessionsEnded: true, simulated: true },
      reason: 'Repeated failed sign-in attempts (simulated)',
      outcome: 'allowed' as const,
      createdAt: lockedAt,
    },
  ]

  const collections: DemoCollections = {
    users: toRows('users', users),
    verifications: [],
    organisations: toRows('organisations', buildOrganisationRows(organisationSeeds, cal)),
    profiles: toRows('profiles', profiles),
    trainerProfiles: toRows('trainerProfiles', trainer.profiles),
    trainerProgrammes: toRows('trainerProgrammes', trainer.approvals),
    programmes: toRows('programmes', catalogue.programmes),
    courses: toRows('courses', catalogue.courses),
    contentPackages: toRows('contentPackages', [
      ...catalogue.packages,
      ...buildContentPackages(cal, catalogue.ids.course),
    ]),
    learningPaths: toRows('learningPaths', catalogue.paths),
    pathVersions: toRows('pathVersions', catalogue.versions),
    pathItems: toRows('pathItems', catalogue.items),
    assignmentRules: toRows('assignmentRules', catalogue.rules),
    enrolments: toRows('enrolments', activity.enrolments),
    unitProgress: toRows('unitProgress', activity.units),
    assessments: toRows('assessments', catalogue.assessments),
    assessmentAttempts: toRows('assessmentAttempts', activity.attempts),
    assessmentAnswers: toRows('assessmentAnswers', activity.answers),
    rolePlayAttempts: toRows('rolePlayAttempts', activity.rolePlays),
    sessions: toRows('sessions', sessions.sessions),
    sessionReschedules: toRows('sessionReschedules', sessions.reschedules),
    rsvps: toRows('rsvps', sessions.rsvps),
    attendance: toRows('attendance', sessions.attendance),
    sessionScores: toRows('sessionScores', sessions.scores),
    assignments: toRows('assignments', catalogue.assignments),
    submissions: toRows('submissions', activity.submissions),
    reviews: toRows('reviews', activity.reviews),
    certificates: toRows('certificates', credentials.certificates),
    notifications: toRows('notifications', [...sessions.notifications, ...activity.notifications]),
    auditEvents: toRows('auditEvents', audit),
    seatOffers: [],
    approvalRequests: toRows('approvalRequests', approvals.approvalRequests),
    questionBank: toRows('questionBank', buildQuestionBank(cal)),
    assessmentRules: toRows('assessmentRules', buildAssessmentRules(cal, catalogue.ids.assessment)),
    attemptGrants: [],
    cpdLedger: toRows('cpdLedger', credentials.cpdLedger),
    externalCertificates: toRows('externalCertificates', credentials.externalCertificates),
    licenceStatus: toRows('licenceStatus', credentials.licenceStatus),
    xapiStatements: toRows('xapiStatements', buildXapiStatements(cal, cast)),
    crmMappings: toRows('crmMappings', buildCrmMappings(cal, cast)),
    crmEvents: toRows('crmEvents', buildCrmEvents(cal, cast)),
    integrationSettings: toRows('integrationSettings', buildIntegrationSettings(cal)),
  }

  const meta: DemoMetaRow = {
    referenceDate,
    seedVersion: SEED_VERSION,
    seededAt: seededAt.toISOString(),
    counts: {
      learners: collections.profiles.length,
      trainers: collections.trainerProfiles.length,
      organisations: collections.organisations.length,
      enrolments: collections.enrolments.length,
      sessions: collections.sessions.length,
      rsvps: collections.rsvps.length,
      certificates: collections.certificates.length,
      notifications: collections.notifications.length,
    },
    clockOffsetDays: 0,
  }
  const settings: DemoSettings = structuredClone(DEFAULT_DEMO_SETTINGS)
  return { ...collections, meta, settings }
}
