import { db } from '@server/db/connection'
import { auditEvents, profiles, rsvps, sessions } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { ChangeRequestDecisionInput } from '@shared/schemas/booking-rsvp'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { changeDecisionMessage } from '../notifications/notification-copy'
import { notify } from '../notifications/notifications.service'
import type { Actor } from '../sessions/actor'
import { lockSession, syncCapacityStatus } from '../sessions/session-store'
import { promoteFromWaitlist, renumberWaitlist } from './waitlist'

/**
 * Late change requests (brief §6: changes inside 24 hours need admin review). A request is the
 * `rsvp.change_requested` audit event the learner raised; the admin's decision is a second
 * audit event, so the history stays in one place. Approving releases the seat (the learner can
 * then rebook); declining keeps the booking. Either way the learner is told.
 */

const REQUESTED = 'rsvp.change_requested'
const DECIDED = { approved: 'rsvp.change_approved', declined: 'rsvp.change_declined' } as const

type RequestAfter = { sessionId?: string; sessionCode?: string; kind?: 'cancel' | 'reschedule' }

export async function listChangeRequests() {
  const requests = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.action, REQUESTED))
    .orderBy(desc(auditEvents.createdAt))
    .limit(100)
  const rsvpIds = requests.map((r) => r.objectId).filter((id): id is string => Boolean(id))
  if (rsvpIds.length === 0) return []

  const [bookings, decisions] = await Promise.all([
    db
      .select({
        rsvpId: rsvps.id,
        status: rsvps.status,
        sessionId: sessions.id,
        sessionCode: sessions.code,
        sessionTitle: sessions.title,
        startsAt: sessions.startsAt,
        learnerCode: profiles.learnerCode,
        learnerName: profiles.fullName,
      })
      .from(rsvps)
      .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
      .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
      .where(inArray(rsvps.id, rsvpIds)),
    db
      .select()
      .from(auditEvents)
      .where(
        and(
          inArray(auditEvents.action, Object.values(DECIDED)),
          inArray(auditEvents.objectId, rsvpIds),
        ),
      ),
  ])

  return requests.flatMap((request) => {
    const booking = bookings.find((b) => b.rsvpId === request.objectId)
    if (!booking) return []
    const decision = decisions.find((d) => d.objectId === request.objectId)
    const after = (request.after ?? {}) as RequestAfter
    return [
      {
        rsvpId: booking.rsvpId,
        requestedAt: request.createdAt,
        kind: after.kind ?? 'reschedule',
        reason: request.reason,
        learner: { code: booking.learnerCode ?? 'Unknown', name: booking.learnerName ?? 'Learner' },
        session: {
          id: booking.sessionId,
          code: booking.sessionCode,
          title: booking.sessionTitle,
          startsAt: booking.startsAt,
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
}

export async function decideChangeRequest(
  actor: Actor,
  rsvpId: string,
  input: ChangeRequestDecisionInput,
) {
  const [request] = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.action, REQUESTED), eq(auditEvents.objectId, rsvpId)))
    .limit(1)
  if (!request) throw HttpError.notFound('Change request not found')
  const [already] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(
      and(inArray(auditEvents.action, Object.values(DECIDED)), eq(auditEvents.objectId, rsvpId)),
    )
    .limit(1)
  if (already) {
    throw new HttpError(409, 'ALREADY_DECIDED', 'This change request has already been decided.')
  }

  const [row] = await db
    .select({ rsvp: rsvps, title: sessions.title, fullName: profiles.fullName })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
    .where(eq(rsvps.id, rsvpId))
  if (!row) throw HttpError.notFound('Booking not found')
  const kind = ((request.after ?? {}) as RequestAfter).kind ?? 'reschedule'
  const note = input.note?.trim() || null
  const release =
    input.decision === 'approved' &&
    (row.rsvp.status === 'confirmed' || row.rsvp.status === 'waitlisted')

  await db.transaction(async (tx) => {
    if (release) {
      await lockSession(tx, row.rsvp.sessionId)
      await tx
        .update(rsvps)
        .set({
          status: 'cancelled',
          waitlistPosition: null,
          cancelledReason: 'Released by the Academy after a late change request',
        })
        .where(eq(rsvps.id, rsvpId))
      if (row.rsvp.status === 'confirmed') {
        await promoteFromWaitlist(tx, row.rsvp.sessionId, actor.id)
      } else {
        await renumberWaitlist(tx, row.rsvp.sessionId)
      }
      await syncCapacityStatus(tx, row.rsvp.sessionId)
    }
    await recordAudit(
      actor,
      {
        action: DECIDED[input.decision],
        objectType: 'rsvp',
        objectId: rsvpId,
        before: { status: row.rsvp.status },
        after: { decision: input.decision, kind, status: release ? 'cancelled' : row.rsvp.status },
        reason: note,
      },
      tx,
      actor.requestId,
    )
    await notify(
      {
        eventId: `evt-change-decision-${rsvpId}`,
        kind: 'booking_change_decision',
        recipientIds: [row.rsvp.learnerId],
        ...changeDecisionMessage(
          row.fullName?.split(' ')[0] ?? 'there',
          row.title,
          kind,
          input.decision,
          note,
        ),
        actorId: actor.id,
      },
      tx,
    )
  })
  return { rsvpId, decision: input.decision, released: release, decidedAt: now() }
}
