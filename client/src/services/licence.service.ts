import type { LicenceStatus } from '@shared/constants/enums'
import { adminReasonInput } from '@shared/schemas/admin-users'
import {
  ApiError,
  commit,
  db,
  delay,
  nowIso,
  out,
  parseInput,
  requireCapability,
  requireRole,
  updateRow,
} from './api'
import { recordAudit } from './audit.service'
import { reportLmsEvent } from './crm/lms-events'

/**
 * Licence status (SPEC §7): a separate field, sourced from the configured system (the CRM, as an
 * illustrative authority). A passed exam or a valid certificate never implies a valid licence,
 * so nothing here reads credentials. An LMS-to-CRM change request stays pending until the CRM
 * acknowledges it.
 */

export interface LicenceView {
  tracked: boolean
  status: LicenceStatus | null
  source: 'crm'
  pendingRequest: { requestedStatus: LicenceStatus; requestedAt: string; reason: string } | null
}

export function licenceFor(learnerId: string): LicenceView {
  const row = db.licenceStatus.find((l) => l.learnerId === learnerId)
  return {
    tracked: Boolean(row),
    status: row?.status ?? null,
    source: 'crm',
    pendingRequest: row?.pendingRequest ? { ...row.pendingRequest } : null,
  }
}

/** The signed-in learner's own licence field, for the profile page. */
export async function getMyLicence() {
  await delay()
  const learner = requireRole('learner')
  return out(licenceFor(learner.id))
}

/**
 * An authorised admin asks the CRM to review a learner's licence status (LMS to CRM). The row
 * keeps its CRM status and holds the request as pending; only a CRM decision clears it. Training
 * results never change the licence. The CRM event is recorded once and reported to the sync log.
 */
export async function requestLicenceReview(
  learnerId: string,
  input: { requestedStatus: LicenceStatus; reason: string },
) {
  await delay()
  const admin = requireCapability('integration.configure')
  const { reason } = parseInput(adminReasonInput, { reason: input.reason })
  const row = db.licenceStatus.find((l) => l.learnerId === learnerId)
  if (!row) {
    throw ApiError.badRequest('This learner has no licence record from the CRM to review.')
  }
  if (row.pendingRequest) {
    throw ApiError.conflict(
      'REQUEST_PENDING',
      'A review request is already pending until the CRM acknowledges it.',
    )
  }
  const requestedAt = nowIso()
  updateRow(row, {
    pendingRequest: { requestedStatus: input.requestedStatus, requestedAt, reason },
  })
  const outcome = reportLmsEvent({
    dedupeKey: `licence-review:${learnerId}:${requestedAt}`,
    type: 'licence',
    learnerId,
    entityId: learnerId,
    allowUnlinked: true,
    payload: {
      action: 'review_request',
      requestedStatus: input.requestedStatus,
      currentStatus: row.status,
      reason,
    },
  })
  recordAudit(admin, {
    action: 'licence.review_request',
    objectType: 'licence_status',
    objectId: learnerId,
    before: { status: row.status },
    after: { requestedStatus: input.requestedStatus, event: outcome?.eventId ?? null },
    reason,
  })
  commit()
  return out({ requestedAt, eventId: outcome?.eventId ?? null, status: outcome?.status ?? null })
}
