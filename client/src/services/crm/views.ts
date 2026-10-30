import type { CrmDirection, CrmEventStatus, CrmEventType } from '@shared/constants'
import type { CrmEventRow } from '@shared/types/db'
import { learnerDisplayId } from '@shared/utils/identity'
import { db } from '../api'

/** Read models for the CRM screens: readable labels, no raw rows. */

export type CrmEventView = {
  eventId: string
  type: CrmEventType
  direction: CrmDirection
  source: 'CRM' | 'LMS'
  destination: 'CRM' | 'LMS'
  occurredAt: string
  processedAt: string | null
  learnerId: string | null
  learnerDisplayId: string | null
  learnerName: string | null
  externalLearnerId: string | null
  entityId: string | null
  entityLabel: string | null
  status: CrmEventStatus
  attempts: number
  error: string | null
  payloadPreview: string
  /** An unmapped programme code the event carries, when the failure is a mapping gap. */
  unmappedCode: string | null
  canRetry: boolean
  identityReview: boolean
}

export function learnerLabel(userId: string | null): { display: string; name: string } | null {
  if (!userId) return null
  const profile = db.profiles.find((p) => p.userId === userId)
  return profile ? { display: learnerDisplayId(profile.learnerCode), name: profile.fullName } : null
}

function entityLabel(entityId: string | null): string | null {
  if (!entityId) return null
  const enrolment = db.enrolments.find((e) => e.id === entityId)
  if (enrolment) {
    const programme = db.programmes.find((p) => p.id === enrolment.programmeId)
    return `Program ${programme?.code ?? '?'} enrolment`
  }
  const request = db.approvalRequests.find((r) => r.id === entityId)
  if (request) return `Request ${request.code}`
  const attempt = db.assessmentAttempts.find((a) => a.id === entityId)
  if (attempt) return `Attempt ${attempt.attemptNo}`
  const credential = db.certificates.find((c) => c.id === entityId)
  if (credential) return `Credential ${credential.code}`
  return entityId.length > 24 ? `${entityId.slice(0, 8)}…` : entityId
}

export function toEventView(row: CrmEventRow, unmappedCodes: ReadonlySet<string>): CrmEventView {
  const learner = learnerLabel(row.learnerId)
  const code = typeof row.payload.programmeCode === 'string' ? row.payload.programmeCode : null
  const inbound = row.direction === 'crm_to_lms'
  return {
    eventId: row.eventId,
    type: row.type,
    direction: row.direction,
    source: inbound ? 'CRM' : 'LMS',
    destination: inbound ? 'LMS' : 'CRM',
    occurredAt: row.occurredAt,
    processedAt: row.processedAt,
    learnerId: row.learnerId,
    learnerDisplayId: learner?.display ?? null,
    learnerName: learner?.name ?? null,
    externalLearnerId: row.externalLearnerId,
    entityId: row.entityId,
    entityLabel: entityLabel(row.entityId),
    status: row.status,
    attempts: row.attempts,
    error: row.error,
    payloadPreview: JSON.stringify(row.payload, null, 2),
    unmappedCode: row.status === 'failed' && code && unmappedCodes.has(code) ? code : null,
    canRetry: row.status !== 'processed',
    identityReview: row.payload.identityReview === true,
  }
}
