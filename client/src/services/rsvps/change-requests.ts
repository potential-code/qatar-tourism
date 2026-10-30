import type { ChangeRequestDecisionInput } from '@shared/schemas/booking-rsvp'
import type { AuditEventRow } from '@shared/types/db'
import { ApiError, db, nowIso, updateRow, type Viewer } from '../api'
import { recordAudit } from '../audit.service'
import { changeDecisionMessage } from '../notifications/copy'
import { notify } from '../notifications.service'
import { syncCapacityStatus } from '../sessions/store'
import { closeOpenOffer, offerFreedSeats } from './offers'
import { renumberWaitlist } from './waitlist'

/**
 * Late change requests (brief §6: changes inside 24 hours need admin review). A request is the
 * `rsvp.change_requested` audit event the learner raised; the admin's decision is a second
 * audit event, so the history stays in one place. Approving releases the seat (the learner can
 * then rebook); declining keeps the booking. Either way the learner is told.
 *
 * Synchronous helpers; `rsvps.service` wraps them with the admin check and `commit()`.
 */

export const CHANGE_REQUESTED = 'rsvp.change_requested'
const DECIDED = { approved: 'rsvp.change_approved', declined: 'rsvp.change_declined' } as const
const DECIDED_ACTIONS: string[] = Object.values(DECIDED)

type RequestAfter = { sessionId?: string; sessionCode?: string; kind?: 'cancel' | 'reschedule' }

const newestFirst = (a: AuditEventRow, b: AuditEventRow) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)

/** Late change requests, newest first (at most 100), with their decision when made. */
export function changeRequestRows() {
  const requests = db.auditEvents
    .filter((e) => e.action === CHANGE_REQUESTED && e.objectId)
    .sort(newestFirst)
    .slice(0, 100)
  return requests.flatMap((request) => {
    const rsvp = db.rsvps.find((r) => r.id === request.objectId)
    const session = rsvp ? db.sessions.find((s) => s.id === rsvp.sessionId) : undefined
    if (!rsvp || !session) return []
    const profile = db.profiles.find((p) => p.userId === rsvp.learnerId)
    const decision = db.auditEvents.find(
      (e) => DECIDED_ACTIONS.includes(e.action) && e.objectId === rsvp.id,
    )
    const after = (request.after ?? {}) as RequestAfter
    return [
      {
        rsvpId: rsvp.id,
        requestedAt: request.createdAt,
        kind: after.kind ?? ('reschedule' as const),
        reason: request.reason,
        learner: { code: profile?.learnerCode ?? 'Unknown', name: profile?.fullName ?? 'Learner' },
        session: {
          id: session.id,
          code: session.code,
          title: session.title,
          startsAt: session.startsAt,
        },
        bookingStatus: rsvp.status,
        decision: decision
          ? {
              outcome:
                decision.action === DECIDED.approved
                  ? ('approved' as const)
                  : ('declined' as const),
              at: decision.createdAt,
              by: decision.actorLabel,
              note: decision.reason,
            }
          : null,
      },
    ]
  })
}

/** Records the admin's decision; approving an active booking releases its seat. */
export function applyChangeRequestDecision(
  actor: Viewer,
  rsvpId: string,
  input: ChangeRequestDecisionInput,
) {
  const request = db.auditEvents.find((e) => e.action === CHANGE_REQUESTED && e.objectId === rsvpId)
  if (!request) throw ApiError.notFound('Change request not found')
  if (db.auditEvents.some((e) => DECIDED_ACTIONS.includes(e.action) && e.objectId === rsvpId)) {
    throw ApiError.conflict('ALREADY_DECIDED', 'This change request has already been decided.')
  }
  const rsvp = db.rsvps.find((r) => r.id === rsvpId)
  const session = rsvp ? db.sessions.find((s) => s.id === rsvp.sessionId) : undefined
  if (!rsvp || !session) throw ApiError.notFound('Booking not found')

  const fullName = db.profiles.find((p) => p.userId === rsvp.learnerId)?.fullName
  const kind = ((request.after ?? {}) as RequestAfter).kind ?? 'reschedule'
  const note = input.note?.trim() || null
  const previous = rsvp.status
  let offersCreated = 0
  const release =
    input.decision === 'approved' &&
    (previous === 'confirmed' || previous === 'waitlisted' || previous === 'offered')

  if (release) {
    updateRow(rsvp, {
      status: 'cancelled',
      waitlistPosition: null,
      cancelledReason: 'Released by the Academy after a late change request',
    })
    if (previous === 'confirmed' || previous === 'offered') {
      closeOpenOffer(rsvp.id, 'declined')
      offersCreated = offerFreedSeats(rsvp.sessionId, actor.id).length
    } else {
      renumberWaitlist(rsvp.sessionId)
    }
    syncCapacityStatus(rsvp.sessionId)
  }
  recordAudit(actor, {
    action: DECIDED[input.decision],
    objectType: 'rsvp',
    objectId: rsvpId,
    before: { status: previous },
    after: { decision: input.decision, kind, status: release ? 'cancelled' : previous },
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
      input.decision,
      note,
    ),
    actorId: actor.id,
  })
  return { rsvpId, decision: input.decision, released: release, offersCreated, decidedAt: nowIso() }
}
