import { type ProgrammeCode, RSVP_STATUSES, type RsvpStatus } from '@shared/constants'
import type { RsvpRow, SessionRow } from '@shared/types/db'
import { ApiError, db, updateRow } from '../api'

/**
 * Session reads shared by the sessions, rsvps, attendance and exports services (formerly
 * server/modules/sessions/session-store.ts), and by the admin sessions service. The browser
 * runs one service call at a time synchronously after its `delay()`, so the old row locks and
 * advisory locks are not needed: a check and the write that follows it can never interleave.
 */

export const ACTIVE_RSVP = ['confirmed', 'waitlisted'] as const
export type ActiveRsvpStatus = (typeof ACTIVE_RSVP)[number]

export const isActiveRsvp = (rsvp: Pick<RsvpRow, 'status'>): boolean =>
  (ACTIVE_RSVP as readonly string[]).includes(rsvp.status)

/** Sort rank of an RSVP status in the enum's declared order (as Postgres sorted enums). */
export const rsvpStatusRank = (status: RsvpStatus): number => RSVP_STATUSES.indexOf(status)

/** Milliseconds of an ISO instant (rows store ISO strings). */
export const ms = (iso: string): number => Date.parse(iso)

/** One session with its trainer, programme and live seat counts. */
export interface SessionCard {
  session: SessionRow
  trainerName: string
  trainerCode: string
  trainerHeadline: string
  trainerAvatar: string | null
  trainerUserId: string
  programmeCode: ProgrammeCode
  programmeTitle: string
  confirmed: number
  waitlisted: number
}

/** Confirmed and waitlisted counts for one session. */
export function countActive(sessionId: string) {
  let confirmed = 0
  let waitlisted = 0
  for (const r of db.rsvps) {
    if (r.sessionId !== sessionId) continue
    if (r.status === 'confirmed') confirmed += 1
    else if (r.status === 'waitlisted') waitlisted += 1
  }
  return { confirmed, waitlisted }
}

/** Seat counts for every session in one pass. */
function countsBySession() {
  const counts = new Map<string, { confirmed: number; waitlisted: number }>()
  for (const r of db.rsvps) {
    if (r.status !== 'confirmed' && r.status !== 'waitlisted') continue
    const entry = counts.get(r.sessionId) ?? { confirmed: 0, waitlisted: 0 }
    entry[r.status] += 1
    counts.set(r.sessionId, entry)
  }
  return counts
}

/** Cards for the sessions matching `where`, ordered by start time. */
export function selectSessionCards(where: (session: SessionRow) => boolean = () => true) {
  const trainers = new Map(db.trainerProfiles.map((t) => [t.id, t]))
  const programmes = new Map(db.programmes.map((p) => [p.id, p]))
  const counts = countsBySession()
  const cards: SessionCard[] = []
  for (const session of db.sessions) {
    if (!where(session)) continue
    const trainer = trainers.get(session.trainerId)
    const programme = programmes.get(session.programmeId)
    if (!trainer || !programme) continue
    const count = counts.get(session.id) ?? { confirmed: 0, waitlisted: 0 }
    cards.push({
      session,
      trainerName: trainer.fullName,
      trainerCode: trainer.code,
      trainerHeadline: trainer.headline,
      trainerAvatar: trainer.avatarPath,
      trainerUserId: trainer.userId,
      programmeCode: programme.code,
      programmeTitle: programme.title,
      ...count,
    })
  }
  return cards.sort((a, b) => ms(a.session.startsAt) - ms(b.session.startsAt))
}

export function getSessionCard(id: string): SessionCard {
  const [card] = selectSessionCards((s) => s.id === id)
  if (!card) throw ApiError.notFound('Session not found')
  return card
}

/** The live session row, or a 404. */
export function findSession(id: string): SessionRow {
  const row = db.sessions.find((s) => s.id === id)
  if (!row) throw ApiError.notFound('Session not found')
  return row
}

/** Published and Full follow the seat count. Draft, Completed and Cancelled never change here. */
export function syncCapacityStatus(sessionId: string) {
  const session = findSession(sessionId)
  if (session.status !== 'published' && session.status !== 'full') return session.status
  const { confirmed } = countActive(sessionId)
  const next = confirmed >= session.capacity ? 'full' : 'published'
  if (next !== session.status) updateRow(session, { status: next })
  return next
}

const overlaps = (s: SessionRow, start: number, end: number) =>
  ms(s.startsAt) < end && ms(s.endsAt) > start

/** A trainer's other sessions overlapping [start, end), cancelled ones excluded. */
export function trainerOverlaps(
  trainerId: string,
  start: Date,
  end: Date,
  excludeSessionId?: string,
) {
  return db.sessions
    .filter(
      (s) =>
        s.trainerId === trainerId &&
        s.status !== 'cancelled' &&
        s.id !== excludeSessionId &&
        overlaps(s, start.getTime(), end.getTime()),
    )
    .map((s) => ({ id: s.id, code: s.code, title: s.title }))
}

/** Active bookings of the given learners that overlap [start, end), excluding one session. */
export function learnerOverlaps(
  learnerIds: string[],
  start: Date,
  end: Date,
  excludeSessionId: string,
) {
  if (learnerIds.length === 0) return []
  const wanted = new Set(learnerIds)
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  return db.rsvps.flatMap((r) => {
    if (!wanted.has(r.learnerId) || !isActiveRsvp(r) || r.sessionId === excludeSessionId) return []
    const s = sessions.get(r.sessionId)
    if (!s || s.status === 'cancelled' || !overlaps(s, start.getTime(), end.getTime())) return []
    return [{ learnerId: r.learnerId, sessionCode: s.code }]
  })
}

/** Programme code of a session, for progress recomputation. */
export function programmeOf(sessionId: string): ProgrammeCode | null {
  const session = db.sessions.find((s) => s.id === sessionId)
  return db.programmes.find((p) => p.id === session?.programmeId)?.code ?? null
}
