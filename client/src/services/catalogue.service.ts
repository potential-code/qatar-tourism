import type { ProgrammeCode } from '@shared/constants'
import { COURSE_BY_CODE, PROGRAMMES_CONTENT } from '@shared/content'
import type { ProgrammeRow, TrainerProfileRow } from '@shared/types/db'
import { ApiError, db, delay, indexBy, nowIso, out } from './api'

/**
 * Public catalogue reads (brief §2–3, §16), formerly server/modules/programmes/programmes.service.ts.
 * Open to signed-out visitors: nothing here returns learner data or trainer contact details.
 */

/** Session states a visitor can see in the public catalogue. Drafts and cancellations are hidden. */
const PUBLIC_SESSION_STATUSES: readonly string[] = ['published', 'full']

const programmeCard = (row: ProgrammeRow) => {
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
}

export type PublicProgramme = ReturnType<typeof programmeCard>

const byCode = <T extends { code: string }>(a: T, b: T) => a.code.localeCompare(b.code)

function publishedProgrammes() {
  return db.programmes.filter((p) => p.status === 'published').sort(byCode)
}

/** Published programmes, A to C. */
export async function listProgrammes(): Promise<PublicProgramme[]> {
  await delay()
  return out(publishedProgrammes().map(programmeCard))
}

/** Default path units, in order, with the course details the overview needs. */
function defaultPathUnits(programmeId: string) {
  const path = db.learningPaths.find((p) => p.programmeId === programmeId && p.isDefault)
  if (!path?.currentVersionId) return []
  const courses = indexBy(db.courses, (c) => c.id)
  return db.pathItems
    .filter((item) => item.pathVersionId === path.currentVersionId)
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const courseCode = item.courseId ? (courses.get(item.courseId)?.code ?? null) : null
      const course = courseCode ? COURSE_BY_CODE[courseCode] : undefined
      return {
        position: item.position,
        kind: item.kind,
        title: item.title,
        required: item.required,
        level: item.level,
        stage: item.stage,
        note: item.note,
        courseCode,
        formatLabel: course?.formatLabel ?? null,
        durationMinutes: course?.durationMinutes ?? null,
        summary: course?.summary ?? null,
        completionText: course?.completionText ?? null,
      }
    })
}

function programmePaths(programmeId: string) {
  return db.learningPaths
    .filter((p) => p.programmeId === programmeId)
    .sort(byCode)
    .map((p) => ({
      code: p.code,
      name: p.name,
      description: p.description,
      isDefault: p.isDefault,
    }))
}

const trainerCard = (row: TrainerProfileRow) => ({
  code: row.code,
  fullName: row.fullName,
  headline: row.headline,
  bio: row.bio,
  expertise: row.expertise,
  languages: row.languages,
  organisation: row.organisation,
  avatarPath: row.avatarPath,
})

function programmeTrainers(programmeId: string) {
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  return db.trainerProgrammes
    .filter((tp) => tp.programmeId === programmeId)
    .flatMap((tp) => {
      const trainer = trainers.get(tp.trainerId)
      return trainer ? [trainerCard(trainer)] : []
    })
    .sort(byCode)
}

export type SessionFilter = { programme?: ProgrammeCode; trainerCode?: string; limit?: number }

/**
 * Upcoming sample sessions (brief §2 "Sessions and trainers", §16). Seats are counted from
 * confirmed RSVPs, so the numbers move when learners book.
 */
function upcomingSessions(filter: SessionFilter = {}) {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  const booked = new Map<string, number>()
  const waiting = new Map<string, number>()
  for (const rsvp of db.rsvps) {
    if (rsvp.status === 'confirmed')
      booked.set(rsvp.sessionId, (booked.get(rsvp.sessionId) ?? 0) + 1)
    if (rsvp.status === 'waitlisted')
      waiting.set(rsvp.sessionId, (waiting.get(rsvp.sessionId) ?? 0) + 1)
  }
  const instant = nowIso()

  return db.sessions
    .flatMap((s) => {
      const programme = programmes.get(s.programmeId)
      const trainer = trainers.get(s.trainerId)
      if (!programme || !trainer) return []
      if (!PUBLIC_SESSION_STATUSES.includes(s.status) || s.startsAt <= instant) return []
      if (filter.programme && programme.code !== filter.programme) return []
      if (filter.trainerCode && trainer.code !== filter.trainerCode) return []
      const seatsTaken = booked.get(s.id) ?? 0
      return [
        {
          id: s.id,
          code: s.code,
          title: s.title,
          programmeCode: programme.code,
          programmeTitle: programme.title,
          level: s.level,
          stage: s.stage,
          format: s.format,
          status: s.status,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          timezone: s.timezone,
          capacity: s.capacity,
          venue: s.venue,
          room: s.room,
          description: s.description,
          isCompletionGate: s.isCompletionGate,
          prerequisite: s.prerequisite,
          trainerCode: trainer.code,
          trainerName: trainer.fullName,
          trainerHeadline: trainer.headline,
          trainerAvatar: trainer.avatarPath,
          booked: seatsTaken,
          waitlisted: waiting.get(s.id) ?? 0,
          seatsRemaining: Math.max(0, s.capacity - seatsTaken),
        },
      ]
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, filter.limit ?? 50)
}

export type PublicSession = ReturnType<typeof upcomingSessions>[number]

/** Upcoming published sessions, optionally for one programme. */
export async function listUpcomingSessions(programme?: ProgrammeCode): Promise<PublicSession[]> {
  await delay()
  return out(upcomingSessions({ programme }))
}

/** A published programme's overview: units, paths, trainers, rules and upcoming sessions. */
export async function getProgramme(code: ProgrammeCode) {
  await delay()
  const row = db.programmes.find((p) => p.code === code)
  if (row?.status !== 'published') throw ApiError.notFound('Programme not found')
  return out({
    ...programmeCard(row),
    completionRules: row.completionRules,
    units: defaultPathUnits(row.id),
    paths: programmePaths(row.id),
    trainers: programmeTrainers(row.id),
    upcomingSessions: upcomingSessions({ programme: code, limit: 6 }),
  })
}

export type ProgrammeDetail = Awaited<ReturnType<typeof getProgramme>>

function trainerList() {
  const programmes = indexBy(db.programmes, (p) => p.id)
  return [...db.trainerProfiles].sort(byCode).map((row) => ({
    ...trainerCard(row),
    programmes: db.trainerProgrammes
      .filter((tp) => tp.trainerId === row.id)
      .flatMap((tp) => {
        const code = programmes.get(tp.programmeId)?.code
        return code ? [code] : []
      })
      .sort(),
  }))
}

export type PublicTrainer = ReturnType<typeof trainerList>[number]

/** Every trainer profile with the programmes they are approved for. No contact details. */
export async function listTrainers(): Promise<PublicTrainer[]> {
  await delay()
  return out(trainerList())
}

/** One trainer's public profile and their upcoming sessions. */
export async function getTrainer(code: string) {
  await delay()
  const trainer = trainerList().find((row) => row.code === code)
  if (!trainer) throw ApiError.notFound('Trainer not found')
  return out({ ...trainer, upcomingSessions: upcomingSessions({ trainerCode: code }) })
}

export type TrainerDetail = Awaited<ReturnType<typeof getTrainer>>
