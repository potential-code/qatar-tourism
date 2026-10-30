import { adminReasonInput } from '@shared/schemas/admin-users'
import type { ApprovalRequestRow } from '@shared/types/db'
import { accountStatusOf, learnerDisplayId } from '@shared/utils/identity'
import { z } from 'zod'
import { ApiError, commit, db, delay, out, parseInput, requireCapability } from './api'
import { DECIDABLE, type Decision, decideRequest } from './approvals/decide'
import { settleOffers } from './rsvps/offers'
import { waitlistEntries } from './rsvps-waitlist.service'

/**
 * Enrolments and Approvals (SPEC §5), admin side. Two distinct request types, programme
 * enrolment and external certificate. Reviewing needs `approval.review` (admins only).
 */

export type ApprovalFilter = {
  status?: ApprovalRequestRow['status']
  type?: ApprovalRequestRow['type']
}

const filterInput = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'info_requested']).optional(),
  type: z.enum(['enrolment', 'external_certificate']).optional(),
})

/** One request as the review table shows it. */
function toRow(request: ApprovalRequestRow) {
  const profile = db.profiles.find((p) => p.userId === request.learnerId)
  const reviewer = db.users.find((u) => u.id === request.reviewerId)
  const programme = db.programmes.find((p) => p.id === request.programmeId)
  const session = db.sessions.find((s) => s.id === request.sessionId)
  const cert = db.externalCertificates.find((c) => c.id === request.externalCertificateId)
  return {
    id: request.id,
    code: request.code,
    type: request.type,
    status: request.status,
    learner: {
      id: request.learnerId,
      displayId: learnerDisplayId(profile?.learnerCode ?? 'L0000'),
      name: profile?.fullName ?? 'Learner',
    },
    target:
      request.type === 'enrolment'
        ? `Program ${programme?.code ?? '?'} enrolment${session ? ` for ${session.code}` : ''}`
        : (cert?.title ?? 'External certificate'),
    sessionCode: session?.code ?? null,
    submittedAt: request.submittedAt,
    reviewer: reviewer?.name ?? null,
    evidence: request.evidence,
    reason: request.reason,
    decidedAt: request.decidedAt,
    claimedAmount: cert?.claimedAmount ?? null,
    unit: cert?.unit ?? null,
  }
}

export type ApprovalRow = ReturnType<typeof toRow>

/** Requests, newest first, optionally filtered by status and type. */
export async function listApprovals(filter: ApprovalFilter = {}) {
  await delay()
  requireCapability('approval.review')
  const { status, type } = parseInput(filterInput, filter, 'query')
  const items = db.approvalRequests
    .filter((r) => (!status || r.status === status) && (!type || r.type === type))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.code.localeCompare(a.code))
    .map(toRow)
  return out({ items })
}

const decisionInput = z.object({
  decision: z.enum(['approve', 'reject', 'request_info']),
  reason: z.string().trim().max(300).optional(),
  recognisedAmount: z.number().positive().max(100).optional(),
})

/**
 * Approve, reject (reason required) or ask for more information (message required). Audited
 * with reviewer, timestamp and reason; the learner is notified and sees the result at once.
 */
export async function decideApproval(
  requestId: string,
  input: { decision: Decision; reason?: string; recognisedAmount?: number },
) {
  await delay()
  const admin = requireCapability('approval.review')
  const body = parseInput(decisionInput, input)
  const request = db.approvalRequests.find((r) => r.id === requestId || r.code === requestId)
  if (!request) throw ApiError.notFound('Request not found')
  if (!DECIDABLE.includes(request.status)) {
    throw ApiError.conflict('ALREADY_DECIDED', 'This request has already been decided.')
  }
  const needsReason = body.decision !== 'approve'
  const reason = body.reason?.trim() || null
  if (needsReason) parseInput(adminReasonInput, { reason: reason ?? '' })
  const outcome = decideRequest(admin, request, body.decision, reason, body.recognisedAmount)
  commit()
  return out({ code: request.code, ...outcome })
}

/** The three counts on the admin dashboard; each is the length of the list it opens. */
export async function getAttentionCounts() {
  await delay()
  requireCapability('approval.review')
  if (settleOffers()) commit()
  const waitlist = waitlistEntries()
  return out({
    pendingApprovals: db.approvalRequests.filter((r) => r.status === 'pending').length,
    waitlistedLearners: new Set(waitlist.map((e) => e.learnerId)).size,
    lockedAccounts: db.profiles.filter((p) => accountStatusOf(p) === 'locked').length,
  })
}

export type AttentionCounts = Awaited<ReturnType<typeof getAttentionCounts>>
