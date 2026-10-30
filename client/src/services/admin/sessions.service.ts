import { RSVP_STATUSES } from '@shared/constants'
import { sessionIdParam } from '@shared/schemas/admin-catalogue'
import { commit, db, delay, findOr404, indexBy, out, parseInput, requireRole } from '../api'
import { settleOffers } from '../rsvps/offers'
import type { listChangeRequests } from '../rsvps.service'

/**
 * Session management (brief §14), formerly /api/admin/sessions. Admin only. Editing,
 * rescheduling and cancelling reuse the trainer scheduling flow (sessions service); the one
 * late change requests (brief §6) are decided in the rsvps service and re-exported here.
 */

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt)

/** All 30 sessions with programme, trainer, booking and attendance counts, by start time. */
export async function listSessions() {
  await delay()
  requireRole('admin')
  if (settleOffers()) commit()
  const programmes = indexBy(db.programmes, (p) => p.id)
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  const items = [...db.sessions]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .flatMap((s) => {
      const trainer = trainers.get(s.trainerId)
      const programme = programmes.get(s.programmeId)
      if (!trainer || !programme) return []
      const bookings = db.rsvps.filter((r) => r.sessionId === s.id)
      const records = db.attendance.filter((a) => a.sessionId === s.id)
      const count = (status: string) => bookings.filter((r) => r.status === status).length
      return [
        {
          id: s.id,
          code: s.code,
          title: s.title,
          programme: programme.code,
          level: s.level,
          stage: s.stage,
          trainerId: s.trainerId,
          trainerCode: trainer.code,
          trainerName: trainer.fullName,
          format: s.format,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          timezone: s.timezone,
          capacity: s.capacity,
          venue: s.venue,
          room: s.room,
          meetingRef: s.meetingRef,
          status: s.status,
          isCompletionGate: s.isCompletionGate,
          confirmed: count('confirmed'),
          waitlisted: count('waitlisted'),
          offered: count('offered'),
          cancelledRsvps: count('cancelled'),
          reschedules: db.sessionReschedules.filter((r) => r.sessionId === s.id).length,
          present: records.filter((a) => a.status === 'attended' || a.status === 'late').length,
          marked: records.filter((a) => a.status !== 'pending').length,
        },
      ]
    })
  return out({ items })
}

/** Booking states in their declared order (the old enum sort). */
const RSVP_ORDER: readonly string[] = RSVP_STATUSES

/** One session's details, roster and reschedule history. */
export async function getSession(sessionId: string) {
  await delay()
  requireRole('admin')
  parseInput(sessionIdParam, { sessionId }, 'param')
  if (settleOffers()) commit()
  const offers = new Map(
    db.seatOffers.filter((o) => o.status === 'offered').map((o) => [o.rsvpId, o.expiresAt]),
  )
  const s = findOr404(db.sessions, (row) => row.id === sessionId, 'Session not found')
  const profiles = indexBy(db.profiles, (p) => p.userId)
  const users = indexBy(db.users, (u) => u.id)
  const attendance = indexBy(db.attendance, (a) => a.rsvpId)
  const rank = (status: string) => {
    const index = RSVP_ORDER.indexOf(status)
    return index === -1 ? RSVP_ORDER.length : index
  }
  const roster = db.rsvps
    .filter((r) => r.sessionId === sessionId && profiles.has(r.learnerId))
    .map((r) => {
      const profile = profiles.get(r.learnerId)
      return {
        rsvpId: r.id,
        learnerCode: profile?.learnerCode ?? '',
        name: profile?.fullName ?? '',
        status: r.status,
        waitlistPosition: r.waitlistPosition,
        offerExpiresAt: offers.get(r.id) ?? null,
        bookedAt: r.bookedAt,
        attendance: attendance.get(r.id)?.status ?? null,
      }
    })
    .sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER) ||
        a.learnerCode.localeCompare(b.learnerCode),
    )
  const reschedules = db.sessionReschedules
    .filter((r) => r.sessionId === sessionId)
    .sort(newestFirst)
    .map((r) => ({
      id: r.id,
      previousStartsAt: r.previousStartsAt,
      newStartsAt: r.newStartsAt,
      previousVenue: r.previousVenue,
      newVenue: r.newVenue,
      reason: r.reason,
      affectedRsvps: r.affectedRsvps,
      eventId: r.eventId,
      changedBy: r.changedBy ? (users.get(r.changedBy)?.name ?? null) : null,
      createdAt: r.createdAt,
    }))
  return out({
    id: s.id,
    description: s.description,
    accessNote: s.accessNote,
    joinInstructions: s.joinInstructions,
    bookingDeadline: s.bookingDeadline,
    cancellationPolicy: s.cancellationPolicy,
    prerequisite: s.prerequisite,
    cancelledReason: s.cancelledReason,
    materials: s.materials,
    roster,
    reschedules,
  })
}

/** Late change requests (brief §6) live with the bookings they release. */
export { decideChangeRequest, listChangeRequests } from '../rsvps.service'

export type SessionDetail = Awaited<ReturnType<typeof getSession>>
export type SessionItem = Awaited<ReturnType<typeof listSessions>>['items'][number]
export type ChangeRequest = Awaited<ReturnType<typeof listChangeRequests>>['items'][number]
