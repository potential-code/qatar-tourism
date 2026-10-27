import { setClockState } from '@server/lib/clock'
import { getTableName, is, sql } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import * as schema from '../schema'
import {
  buildOrganisationRows,
  buildProfiles,
  buildTrainerRows,
  buildUsers,
  hashDemoPassword,
} from './accounts'
import { buildActivity } from './activity'
import { buildSeedAudit } from './audit-events'
import { buildCatalogue } from './catalogue'
import { buildLearners } from './learners'
import { buildOrganisations } from './organisations'
import { buildPlan } from './plan'
import { calendar, SEED_VERSION, seedReferenceDate } from './reference-date'
import { Rng } from './rng'
import { buildSessions } from './sessions'

/**
 * Deterministic demo dataset (brief §15–17). The same reference date and password hash always
 * produce the same rows and IDs, so a reset reproduces the same charts.
 *
 * Order: organisations and catalogue, learners, the enrolment plan, sessions (RSVPs, attendance,
 * scores), per-enrolment activity, then accounts and audit rows derived from all of it.
 */

export const SEED_ROOT = 'qta-demo-v1'

export type SeedData = ReturnType<typeof buildSeedData>

export function buildSeedData(options: { referenceDate: string; passwordHash: string }) {
  const rng = new Rng(SEED_ROOT)
  const cal = calendar(options.referenceDate)

  const organisations = buildOrganisations()
  const catalogue = buildCatalogue(cal)
  const learners = buildLearners(rng, organisations)
  const plan = buildPlan(rng, learners)
  const sessions = buildSessions(rng, cal, plan, catalogue.ids.programme)
  const activity = buildActivity(rng, cal, catalogue, plan, learners, sessions)
  const { users, accounts } = buildUsers(learners, activity.learnerDates, options.passwordHash, cal)
  const trainer = buildTrainerRows(catalogue.ids.programme, cal)
  const profiles = buildProfiles(rng, learners, activity.learnerDates)
  const audit = buildSeedAudit(cal, sessions, activity)

  return {
    referenceDate: options.referenceDate,
    cal,
    organisations: buildOrganisationRows(organisations, cal),
    catalogue,
    users,
    accounts,
    profiles,
    trainerProfiles: trainer.profiles,
    trainerProgrammes: trainer.approvals,
    sessions,
    activity,
    audit,
  }
}

// ---------------------------------------------------------------------------------------------
// Database writes
// ---------------------------------------------------------------------------------------------

/** Anything with insert/execute: the pooled db or a transaction. */
type Writer = Pick<typeof import('../connection').db, 'insert' | 'execute'>

async function insertBatched<T extends PgTable>(
  writer: Writer,
  table: T,
  rows: readonly T['$inferInsert'][],
) {
  if (rows.length === 0) return
  const columns = Math.max(1, ...rows.slice(0, 50).map((row) => Object.keys(row).length))
  const size = Math.max(1, Math.floor(30_000 / columns))
  for (let i = 0; i < rows.length; i += size) {
    await writer.insert(table).values(rows.slice(i, i + size) as never)
  }
}

export function allTableNames(): string[] {
  return Object.values(schema as Record<string, unknown>)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableName(table))
}

/** Empties every table the app owns (auth tables included). */
export async function truncateAll(writer: Writer) {
  const names = allTableNames()
    .map((name) => `"${name}"`)
    .join(', ')
  await writer.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`))
}

export async function insertSeed(writer: Writer, data: SeedData, now: Date) {
  const c = data.catalogue
  const a = data.activity
  const s = data.sessions

  await insertBatched(writer, schema.user, data.users)
  await insertBatched(writer, schema.account, data.accounts)
  await insertBatched(writer, schema.organisations, data.organisations)
  await insertBatched(writer, schema.programmes, c.programmes)
  await insertBatched(writer, schema.courses, c.courses)
  await insertBatched(writer, schema.contentPackages, c.packages)
  await insertBatched(writer, schema.learningPaths, c.paths)
  await insertBatched(writer, schema.pathVersions, c.versions)
  await insertBatched(writer, schema.pathItems, c.items)
  await insertBatched(writer, schema.assignmentRules, c.rules)
  await insertBatched(writer, schema.assessments, c.assessments)
  await insertBatched(writer, schema.assignments, c.assignments)
  await insertBatched(writer, schema.trainerProfiles, data.trainerProfiles)
  await insertBatched(writer, schema.trainerProgrammes, data.trainerProgrammes)
  await insertBatched(writer, schema.profiles, data.profiles)
  await insertBatched(writer, schema.sessions, s.sessions)
  await insertBatched(writer, schema.sessionReschedules, s.reschedules)
  await insertBatched(writer, schema.enrolments, a.enrolments)
  await insertBatched(writer, schema.unitProgress, a.units)
  await insertBatched(writer, schema.assessmentAttempts, a.attempts)
  await insertBatched(writer, schema.assessmentAnswers, a.answers)
  await insertBatched(writer, schema.rolePlayAttempts, a.rolePlays)
  await insertBatched(writer, schema.submissions, a.submissions)
  await insertBatched(writer, schema.reviews, a.reviews)
  await insertBatched(writer, schema.rsvps, s.rsvps)
  await insertBatched(writer, schema.attendance, s.attendance)
  await insertBatched(writer, schema.sessionScores, s.scores)
  await insertBatched(writer, schema.certificates, a.certificates)
  await insertBatched(writer, schema.notifications, [...s.notifications, ...a.notifications])
  await insertBatched(writer, schema.auditEvents, data.audit)

  const counts: Record<string, number> = {
    learners: data.profiles.length,
    trainers: data.trainerProfiles.length,
    organisations: data.organisations.length,
    enrolments: a.enrolments.length,
    sessions: s.sessions.length,
    rsvps: s.rsvps.length,
    certificates: a.certificates.length,
    notifications: s.notifications.length + a.notifications.length,
  }
  await writer.insert(schema.demoMeta).values({
    id: 1,
    referenceDate: data.referenceDate,
    seedVersion: SEED_VERSION,
    anchoredAt: now,
    seededAt: now,
    counts,
  })
  return { anchoredAt: now, counts }
}

export function assertSeedAllowed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Refusing to seed or reset: NODE_ENV is production. Set ALLOW_DEMO_SEED=true only on a demonstration deployment.',
    )
  }
}

export type SeedOptions = {
  referenceDate?: string
  password?: string
}

export function seedPassword(explicit?: string): string {
  const password = explicit ?? process.env.SEED_DEMO_PASSWORD
  if (!password || password.length < 12) {
    throw new Error('SEED_DEMO_PASSWORD must be set and at least 12 characters. See .env.example.')
  }
  return password
}

/**
 * Replaces every table's contents with the deterministic dataset, in one transaction. Sessions
 * listed in `keepSessionsOf` (the admin who triggered a reset) are restored afterwards, so they
 * stay signed in.
 */
export async function reseed(options: SeedOptions & { keepSessionsOf?: string } = {}) {
  assertSeedAllowed()
  const { db } = await import('../connection')
  const referenceDate = seedReferenceDate(options.referenceDate)
  const passwordHash = await hashDemoPassword(seedPassword(options.password))
  const data = buildSeedData({ referenceDate, passwordHash })
  const now = new Date()

  await db.transaction(async (tx) => {
    const keptSessions = options.keepSessionsOf
      ? await tx
          .select()
          .from(schema.session)
          .where(sql`${schema.session.userId} = ${options.keepSessionsOf}`)
      : []
    await truncateAll(tx)
    await insertSeed(tx, data, now)
    if (keptSessions.length > 0) await tx.insert(schema.session).values(keptSessions)
  })

  setClockState({ referenceDate, anchoredAt: now })
  return { referenceDate, anchoredAt: now }
}

// `bun run db:seed` / `bun run db:reset`
if (import.meta.main) {
  const { closeDb } = await import('../connection')
  try {
    const { referenceDate } = await reseed()
    const { db } = await import('../connection')
    const [meta] = await db.select().from(schema.demoMeta)
    console.log(`Seeded demo data (reference date ${referenceDate}, version ${SEED_VERSION}).`)
    console.log(meta?.counts)
  } catch (error) {
    console.error('Seed failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}
