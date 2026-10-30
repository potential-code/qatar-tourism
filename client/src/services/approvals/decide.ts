import type { ApprovalRequestRow, ExternalCertificateRow } from '@shared/types/db'
import { db, insertRow, now, nowIso, updateRow, type Viewer } from '../api'
import { recordAudit } from '../audit.service'
import { createEnrolment, enrolmentOf } from '../enrolment/core'
import { notify } from '../notifications.service'
import { evaluate, loadLearnerContext } from '../rsvps/eligibility'
import { nextWaitlistPosition } from '../rsvps/waitlist'
import { getSessionCard, syncCapacityStatus } from '../sessions/store'

/**
 * Deciding an approval request (SPEC §5). Synchronous helpers; `approvals.service` checks the
 * caller and commits.
 *
 * Enrolment: approval comes first, then eligibility and capacity. Approving never bypasses
 * capacity: a full session puts the learner on its waitlist (offers follow when a seat frees); a
 * session whose prerequisite is unmet leaves the learner enrolled without a booking.
 *
 * External certificate: `approvals.service` routes these to `external-certificates.service`
 * `review()`, which owns CPD crediting. The fallback below only runs for a request whose
 * certificate row is missing.
 */

export type Decision = 'approve' | 'reject' | 'request_info'

export const DECIDABLE: readonly ApprovalRequestRow['status'][] = ['pending', 'info_requested']

const STATUS_FOR: Record<Decision, ApprovalRequestRow['status']> = {
  approve: 'approved',
  reject: 'rejected',
  request_info: 'info_requested',
}

export type DecisionOutcome = {
  status: ApprovalRequestRow['status']
  /** What happened to the session booking for an enrolment request that named a session. */
  booking: 'confirmed' | 'waitlisted' | 'not_booked' | null
  note: string | null
}

/** Enrols the learner (idempotent) and, for a named session, books or waitlists them. */
function approveEnrolment(request: ApprovalRequestRow): Pick<DecisionOutcome, 'booking' | 'note'> {
  const programme = db.programmes.find((p) => p.id === request.programmeId)
  if (!programme) return { booking: null, note: null }
  if (!enrolmentOf(request.learnerId, programme.code)) {
    createEnrolment(request.learnerId, programme.code)
  }
  if (!request.sessionId) return { booking: null, note: null }

  const card = getSessionCard(request.sessionId)
  const verdict = evaluate(card, loadLearnerContext(request.learnerId), now())
  if (verdict.state === 'booked') return { booking: null, note: null }
  if (verdict.state === 'locked') {
    return { booking: 'not_booked', note: verdict.reason }
  }
  const waitlisted = verdict.state === 'waitlist'
  insertRow('rsvps', {
    sessionId: request.sessionId,
    learnerId: request.learnerId,
    status: waitlisted ? 'waitlisted' : 'confirmed',
    waitlistPosition: waitlisted ? nextWaitlistPosition(request.sessionId) : null,
    bookedAt: nowIso(),
  })
  syncCapacityStatus(request.sessionId)
  return { booking: waitlisted ? 'waitlisted' : 'confirmed', note: null }
}

/** Fallback: updates the external certificate and its ledger line for a decision. */
function applyExternalCertificateDecision(
  actor: Viewer,
  cert: ExternalCertificateRow,
  decision: Decision,
  reason: string | null,
  recognisedAmount: number | undefined,
) {
  const status = { approve: 'verified', reject: 'rejected', request_info: 'info_requested' }[
    decision
  ] as ExternalCertificateRow['status']
  const recognised = decision === 'approve' ? (recognisedAmount ?? cert.claimedAmount) : null
  updateRow(cert, {
    status,
    reviewerId: actor.id,
    reviewedAt: nowIso(),
    reason,
    recognisedAmount: recognised,
  })
  const line = db.cpdLedger.find((l) => l.externalCertificateId === cert.id)
  if (line && decision !== 'request_info') {
    updateRow(line, {
      status: decision === 'approve' ? 'approved' : 'rejected',
      hours: recognised ?? line.hours,
    })
  }
}

const learnerFirstName = (learnerId: string) =>
  (db.profiles.find((p) => p.userId === learnerId)?.fullName ?? 'there').split(/\s+/)[0] ?? 'there'

function labelOf(request: ApprovalRequestRow): string {
  if (request.type === 'external_certificate') {
    return (
      db.externalCertificates.find((c) => c.id === request.externalCertificateId)?.title ??
      'external certificate'
    )
  }
  const programme = db.programmes.find((p) => p.id === request.programmeId)
  return programme ? `Program ${programme.code}` : 'the programme'
}

/** Records a decision on a request: status, reason, reviewer, audit and a learner notification. */
export function decideRequest(
  actor: Viewer,
  request: ApprovalRequestRow,
  decision: Decision,
  reason: string | null,
  recognisedAmount?: number,
): DecisionOutcome {
  const before = request.status
  const status = STATUS_FOR[decision]
  let booking: DecisionOutcome['booking'] = null
  let note: string | null = null

  if (request.type === 'enrolment' && decision === 'approve') {
    ;({ booking, note } = approveEnrolment(request))
  }
  if (request.type === 'external_certificate' && request.externalCertificateId) {
    const cert = db.externalCertificates.find((c) => c.id === request.externalCertificateId)
    if (cert) applyExternalCertificateDecision(actor, cert, decision, reason, recognisedAmount)
  }

  updateRow(request, {
    status,
    reason,
    reviewerId: actor.id,
    decidedAt: decision === 'request_info' ? null : nowIso(),
    decidedBy: decision === 'request_info' ? null : actor.id,
  })
  recordAudit(actor, {
    action: `approval.${decision}`,
    objectType: 'approval_request',
    objectId: request.code,
    before: { status: before },
    after: {
      status,
      type: request.type,
      booking,
      reviewer: actor.name,
      reviewedAt: nowIso(),
    },
    reason,
  })

  const label = labelOf(request)
  const name = learnerFirstName(request.learnerId)
  const verdict =
    decision === 'approve'
      ? 'approved'
      : decision === 'reject'
        ? 'was not approved'
        : 'needs more information'
  notify({
    eventId: `evt-approval-${request.code}-${status}`,
    kind: 'approval_decision',
    recipientIds: [request.learnerId],
    subject: `Your request ${request.code} ${verdict}`,
    body: `Hello ${name}, your request ${request.code} for ${label} ${verdict}.${reason ? ` Note from the Academy: ${reason}` : ''} This is a demonstration message.`,
    actorId: actor.id,
  })
  return { status, booking, note }
}
