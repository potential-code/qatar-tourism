import { RSVP_STATUSES } from '@shared/constants'
import { sessionIdParam } from '@shared/schemas/admin-catalogue'
import { changeRequestDecisionInput } from '@shared/schemas/booking-rsvp'
import type { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  findOr404,
  indexBy,
  nowIso,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'
import { changeDecisionMessage } from '../notifications/copy'
import { notify } from '../notifications.service'
import { promoteFromWaitlist, renumberWaitlist, syncCapacityStatus } from './sessions/seats'

/**
 * Session management (brief §14), formerly /api/admin/sessions. Admin only. Editing,
 * rescheduling and cancelling reuse the trainer scheduling flow (sessions service); the one
 * write here is the decision on a learner's late change request (brief §6), audited and notified.
 */

const REQUESTED = 'rsvp.change_requested'
const DECIDED = { approved: 'rsvp.change_approved', declined: 'rsvp.change_declined' } as const
const DECIDED_ACTIONS: readonly string[] = Object.values(DECIDED)

type RequestAfter = { sessionId?: string; sessionCode?: string; kind?: 'cancel' | 'reschedule' }

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt)

/** All 30 sessions with programme, trainer, booking and attendance counts, by start time. */
export async function listSessions() {
  await delay()
  requireRole('admin')
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

/** Late change requests (brief §6), newest first, with any decision already taken. */
export async function listChangeRequests() {
  await delay()
  requireRole('admin')
  const requests = db.auditEvents
    .filter((e) => e.action === REQUESTED)
    .sort(newestFirst)
    .slice(0, 100)
  const sessions = indexBy(db.sessions, (s) => s.id)
  const profiles = indexBy(db.profiles, (p) => p.userId)
  const rsvps = indexBy(db.rsvps, (r) => r.id)
  const decisions = db.auditEvents.filter((e) => DECIDED_ACTIONS.includes(e.action))

  const items = requests.flatMap((request) => {
    const booking = request.objectId ? rsvps.get(request.objectId) : undefined
    const session = booking ? sessions.get(booking.sessionId) : undefined
    if (!booking || !session) return []
    const profile = profiles.get(booking.learnerId)
    const decision = decisions.find((d) => d.objectId === request.objectId)
    const after = (request.after ?? {}) as RequestAfter
    return [
      {
        rsvpId: booking.id,
        requestedAt: request.createdAt,
        kind: after.kind ?? 'reschedule',
        reason: request.reason,
        learner: { code: profile?.learnerCode ?? 'Unknown', name: profile?.fullName ?? 'Learner' },
        session: {
          id: session.id,
          code: session.code,
          title: session.title,
          startsAt: session.startsAt,
        },
        bookingStatus: booking.status,
        decision: decision
          ? {
              outcome: decision.action === DECIDED.approved ? 'approved' : 'declined',
              at: decision.createdAt,
              by: decision.actorLabel,
              note: decision.reason,
            }
          : null,
      },
    ]
  })
  return out({ items })
}

/**
 * Approves or declines a late change request. Approving releases the seat (the learner can
 * then rebook) and fills it from the waitlist; declining keeps the booking. Either way the
 * learner is told, and the decision is a second audit event beside the request.
 */
export async function decideChangeRequest(
  rsvpId: string,
  input: z.input<typeof changeRequestDecisionInput>,
) {
  await delay()
  const viewer = requireRole('admin')
  const data = parseInput(changeRequestDecisionInput, input)
  const request = db.auditEvents.find((e) => e.action === REQUESTED && e.objectId === rsvpId)
  if (!request) throw ApiError.notFound('Change request not found')
  if (db.auditEvents.some((e) => DECIDED_ACTIONS.includes(e.action) && e.objectId === rsvpId))
    throw ApiError.conflict('ALREADY_DECIDED', 'This change request has already been decided.')
  const rsvp = findOr404(db.rsvps, (r) => r.id === rsvpId, 'Booking not found')
  const session = findOr404(db.sessions, (s) => s.id === rsvp.sessionId, 'Booking not found')
  const fullName = db.profiles.find((p) => p.userId === rsvp.learnerId)?.fullName ?? null

  const kind = ((request.after ?? {}) as RequestAfter).kind ?? 'reschedule'
  const note = data.note?.trim() || null
  const previous = rsvp.status
  const release =
    data.decision === 'approved' && (previous === 'confirmed' || previous === 'waitlisted')

  if (release) {
    updateRow(rsvp, {
      status: 'cancelled',
      waitlistPosition: null,
      cancelledReason: 'Released by the Academy after a late change request',
    })
    if (previous === 'confirmed') promoteFromWaitlist(session.id, viewer.id)
    else renumberWaitlist(session.id)
    syncCapacityStatus(session.id)
  }
  audit({
    action: DECIDED[data.decision],
    objectType: 'rsvp',
    objectId: rsvpId,
    before: { status: previous },
    after: { decision: data.decision, kind, status: release ? 'cancelled' : previous },
    reason: note,
  })
  notify({
    eventId: `evt-change-decision-${rsvpId}`,
    kind: 'booking_change_decision',
    recipientIds: [rsvp.learnerId],
    ...changeDecisionMessage(
      fullName?.split(' ')[0] ?? 'there',
      session.title,
      kind,
      data.decision,
      note,
    ),
    actorId: viewer.id,
  })
  commit()
  return { rsvpId, decision: data.decision, released: release, decidedAt: nowIso() }
}

export type SessionItem = Awaited<ReturnType<typeof listSessions>>['items'][number]
export type ChangeRequest = Awaited<ReturnType<typeof listChangeRequests>>['items'][number]
