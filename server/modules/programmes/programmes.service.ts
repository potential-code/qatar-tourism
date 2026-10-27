import { db } from '@server/db/connection'
import {
  courses,
  learningPaths,
  pathItems,
  programmes,
  rsvps,
  sessions,
  trainerProfiles,
  trainerProgrammes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import type { ProgrammeCode } from '@shared/constants'
import { COURSE_BY_CODE, PROGRAMMES_CONTENT } from '@shared/content'
import { and, asc, count, eq, gt, inArray, sql } from 'drizzle-orm'

/**
 * Public catalogue reads (brief §2–3, §16). Nothing here returns learner data or trainer
 * contact details: these endpoints are open to signed-out visitors.
 */

/** Session states a visitor can see in the public catalogue. Drafts and cancellations are hidden. */
const PUBLIC_SESSION_STATUSES = ['published', 'full'] as const

export async function listProgrammes() {
  const rows = await db
    .select()
    .from(programmes)
    .where(inArray(programmes.status, ['published']))
    .orderBy(asc(programmes.code))
  return rows.map((row) => {
    const content = PROGRAMMES_CONTENT[row.code]
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      audience: row.audience,
      summary: row.summary,
      formatLabel: row.formatLabel,
      durationLabel: row.durationLabel,
      levels: row.levels,
      certificationEnabled: row.certificationEnabled,
      isIllustrative: row.isIllustrative,
      cardImagePath: row.cardImagePath,
      /** The brief's catalogue line, e.g. "Two levels • Hybrid • Approximately 4 hours • ...". */
      formatLine: content.format,
      cta: content.cta,
    }
  })
}

export type PublicProgramme = Awaited<ReturnType<typeof listProgrammes>>[number]

async function programmeByCode(code: ProgrammeCode) {
  const [row] = await db.select().from(programmes).where(eq(programmes.code, code)).limit(1)
  return row ?? null
}

/** Default path units, in order, with the course details the overview needs. */
async function defaultPathUnits(programmeId: string) {
  const [path] = await db
    .select({ id: learningPaths.id, versionId: learningPaths.currentVersionId })
    .from(learningPaths)
    .where(and(eq(learningPaths.programmeId, programmeId), eq(learningPaths.isDefault, true)))
    .limit(1)
  if (!path?.versionId) return []
  const items = await db
    .select({
      position: pathItems.position,
      kind: pathItems.kind,
      title: pathItems.title,
      required: pathItems.required,
      level: pathItems.level,
      stage: pathItems.stage,
      note: pathItems.note,
      courseCode: courses.code,
    })
    .from(pathItems)
    .leftJoin(courses, eq(courses.id, pathItems.courseId))
    .where(eq(pathItems.pathVersionId, path.versionId))
    .orderBy(asc(pathItems.position))
  return items.map((item) => {
    const course = item.courseCode ? COURSE_BY_CODE[item.courseCode] : undefined
    return {
      ...item,
      formatLabel: course?.formatLabel ?? null,
      durationMinutes: course?.durationMinutes ?? null,
      summary: course?.summary ?? null,
      completionText: course?.completionText ?? null,
    }
  })
}

async function programmePaths(programmeId: string) {
  return db
    .select({
      code: learningPaths.code,
      name: learningPaths.name,
      description: learningPaths.description,
      isDefault: learningPaths.isDefault,
    })
    .from(learningPaths)
    .where(eq(learningPaths.programmeId, programmeId))
    .orderBy(asc(learningPaths.code))
}

const trainerColumns = {
  code: trainerProfiles.code,
  fullName: trainerProfiles.fullName,
  headline: trainerProfiles.headline,
  bio: trainerProfiles.bio,
  expertise: trainerProfiles.expertise,
  languages: trainerProfiles.languages,
  organisation: trainerProfiles.organisation,
  avatarPath: trainerProfiles.avatarPath,
}

async function programmeTrainers(programmeId: string) {
  return db
    .select(trainerColumns)
    .from(trainerProgrammes)
    .innerJoin(trainerProfiles, eq(trainerProfiles.id, trainerProgrammes.trainerId))
    .where(eq(trainerProgrammes.programmeId, programmeId))
    .orderBy(asc(trainerProfiles.code))
}

export async function getProgramme(code: ProgrammeCode) {
  const row = await programmeByCode(code)
  if (row?.status !== 'published') return null
  const [units, paths, trainers, upcoming] = await Promise.all([
    defaultPathUnits(row.id),
    programmePaths(row.id),
    programmeTrainers(row.id),
    listUpcomingSessions({ programme: code, limit: 6 }),
  ])
  const content = PROGRAMMES_CONTENT[code]
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    audience: row.audience,
    summary: row.summary,
    formatLabel: row.formatLabel,
    durationLabel: row.durationLabel,
    levels: row.levels,
    certificationEnabled: row.certificationEnabled,
    isIllustrative: row.isIllustrative,
    cardImagePath: row.cardImagePath,
    completionRules: row.completionRules,
    formatLine: content.format,
    cta: content.cta,
    units,
    paths,
    trainers,
    upcomingSessions: upcoming,
  }
}

export type SessionFilter = { programme?: ProgrammeCode; trainerCode?: string; limit?: number }

/**
 * Upcoming sample sessions (brief §2 "Sessions and trainers", §16). Seats are counted from
 * confirmed RSVPs, so the numbers move when learners book.
 */
export async function listUpcomingSessions(filter: SessionFilter = {}) {
  const confirmed = db
    .select({ sessionId: rsvps.sessionId, booked: count().as('booked') })
    .from(rsvps)
    .where(eq(rsvps.status, 'confirmed'))
    .groupBy(rsvps.sessionId)
    .as('confirmed')
  const waitlisted = db
    .select({ sessionId: rsvps.sessionId, waiting: count().as('waiting') })
    .from(rsvps)
    .where(eq(rsvps.status, 'waitlisted'))
    .groupBy(rsvps.sessionId)
    .as('waitlisted')

  const rows = await db
    .select({
      id: sessions.id,
      code: sessions.code,
      title: sessions.title,
      programmeCode: programmes.code,
      programmeTitle: programmes.title,
      level: sessions.level,
      stage: sessions.stage,
      format: sessions.format,
      status: sessions.status,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      timezone: sessions.timezone,
      capacity: sessions.capacity,
      venue: sessions.venue,
      room: sessions.room,
      description: sessions.description,
      isCompletionGate: sessions.isCompletionGate,
      prerequisite: sessions.prerequisite,
      trainerCode: trainerProfiles.code,
      trainerName: trainerProfiles.fullName,
      trainerHeadline: trainerProfiles.headline,
      trainerAvatar: trainerProfiles.avatarPath,
      booked: sql<number>`coalesce(${confirmed.booked}, 0)::int`,
      waitlisted: sql<number>`coalesce(${waitlisted.waiting}, 0)::int`,
    })
    .from(sessions)
    .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
    .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
    .leftJoin(confirmed, eq(confirmed.sessionId, sessions.id))
    .leftJoin(waitlisted, eq(waitlisted.sessionId, sessions.id))
    .where(
      and(
        inArray(sessions.status, [...PUBLIC_SESSION_STATUSES]),
        gt(sessions.startsAt, now()),
        filter.programme ? eq(programmes.code, filter.programme) : undefined,
        filter.trainerCode ? eq(trainerProfiles.code, filter.trainerCode) : undefined,
      ),
    )
    .orderBy(asc(sessions.startsAt))
    .limit(filter.limit ?? 50)

  return rows.map((row) => ({
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    seatsRemaining: Math.max(0, row.capacity - row.booked),
  }))
}

export type PublicSession = Awaited<ReturnType<typeof listUpcomingSessions>>[number]

export async function listTrainers() {
  const [rows, approvals] = await Promise.all([
    db.select(trainerColumns).from(trainerProfiles).orderBy(asc(trainerProfiles.code)),
    db
      .select({ trainerCode: trainerProfiles.code, programme: programmes.code })
      .from(trainerProgrammes)
      .innerJoin(trainerProfiles, eq(trainerProfiles.id, trainerProgrammes.trainerId))
      .innerJoin(programmes, eq(programmes.id, trainerProgrammes.programmeId)),
  ])
  return rows.map((row) => ({
    ...row,
    programmes: approvals
      .filter((approval) => approval.trainerCode === row.code)
      .map((approval) => approval.programme)
      .sort(),
  }))
}

export async function getTrainer(code: string) {
  const trainers = await listTrainers()
  const trainer = trainers.find((row) => row.code === code)
  if (!trainer) return null
  const upcomingSessions = await listUpcomingSessions({ trainerCode: code })
  return { ...trainer, upcomingSessions }
}
