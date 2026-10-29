import type { DemoMetaRow } from '@shared/types/db'
import type { DemoCollections } from '../tables'
import { buildOrganisationRows, buildProfiles, buildTrainerRows, buildUsers } from './accounts'
import { buildActivity } from './activity'
import { buildSeedAudit } from './audit-events'
import { buildCatalogue } from './catalogue'
import { buildLearners } from './learners'
import { buildOrganisations } from './organisations'
import { buildPlan } from './plan'
import { calendar, SEED_VERSION } from './reference-date'
import { Rng } from './rng'
import { toRows } from './rows'
import { buildSessions } from './sessions'

/**
 * Deterministic demo dataset (brief §15–17), ported from server/db/seed. The same reference date
 * always produces the same rows and IDs, so a reset reproduces the same charts.
 *
 * Order: organisations and catalogue, learners, the enrolment plan, sessions (RSVPs, attendance,
 * scores), per-enrolment activity, then accounts and audit rows derived from all of it.
 */

export const SEED_ROOT = 'qta-demo-v1'

export type Seed = DemoCollections & { meta: DemoMetaRow }

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
  const audit = buildSeedAudit(cal, sessions, activity)

  const collections: DemoCollections = {
    users: toRows('users', users),
    verifications: [],
    organisations: toRows('organisations', buildOrganisationRows(organisationSeeds, cal)),
    profiles: toRows('profiles', profiles),
    trainerProfiles: toRows('trainerProfiles', trainer.profiles),
    trainerProgrammes: toRows('trainerProgrammes', trainer.approvals),
    programmes: toRows('programmes', catalogue.programmes),
    courses: toRows('courses', catalogue.courses),
    contentPackages: toRows('contentPackages', catalogue.packages),
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
    certificates: toRows('certificates', activity.certificates),
    notifications: toRows('notifications', [...sessions.notifications, ...activity.notifications]),
    auditEvents: toRows('auditEvents', audit),
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
  }
  return { ...collections, meta }
}
