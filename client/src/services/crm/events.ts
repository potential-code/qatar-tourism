import type { CrmDirection, CrmEventType, LicenceStatus } from '@shared/constants'
import type { CrmEventRow } from '@shared/types/db'
import { db, insertRow, nowIso } from '../api'
import { type AuditActor, recordAudit } from '../audit.service'
import { enrolmentOf } from '../enrolment/core'
import {
  CRM_COPY,
  crmConfig,
  fieldRows,
  findEvent,
  matchLearner,
  nextEventId,
  patchCrmConfig,
} from './common'
import { lookupProgramme } from './mapping'

/**
 * The simulated event engine. Rules (SPEC §9):
 *  - the immutable event id is the dedup key: a processed event is never applied twice,
 *  - learners are matched by the stable external id and are never created,
 *  - a stale inbound event never silently overwrites a newer status,
 *  - an outage or a pause keeps the event queued for retry.
 * Synchronous; the calling service checks permission and commits.
 */

/** Which directions each event type may flow (SPEC §8 Events). */
const ALLOWED: Record<CrmEventType, readonly CrmDirection[]> = {
  enrolment: ['crm_to_lms', 'lms_to_crm'],
  completion: ['lms_to_crm'],
  examination: ['crm_to_lms', 'lms_to_crm'],
  certification: ['crm_to_lms', 'lms_to_crm'],
  licence: ['crm_to_lms', 'lms_to_crm'],
}

export type ProcessOutcome = {
  eventId: string
  status: CrmEventRow['status']
  message: string
  /** True when the event had already been processed and nothing was changed. */
  duplicate: boolean
}

type NewEvent = {
  eventId?: string
  type: CrmEventType
  direction: CrmDirection
  learnerId: string | null
  externalLearnerId: string | null
  entityId?: string | null
  payload: Record<string, unknown>
  occurredAt?: string
}

/**
 * Records an event and tries to deliver or apply it. Idempotent by event id: an id that already
 * exists returns the stored event and processes it only if it is not already processed.
 */
export function submitEvent(actor: AuditActor | null, input: NewEvent): ProcessOutcome {
  const eventId = input.eventId ?? nextEventId()
  const existing = findEvent(eventId)
  if (existing) return processEvent(actor, existing)
  const at = input.occurredAt ?? nowIso()
  const row = insertRow('crmEvents', {
    eventId,
    type: input.type,
    direction: input.direction,
    learnerId: input.learnerId,
    externalLearnerId: input.externalLearnerId,
    entityId: input.entityId ?? null,
    status: 'queued',
    attempts: 0,
    error: null,
    payload: input.payload,
    occurredAt: at,
    processedAt: null,
  })
  return processEvent(actor, row)
}

/** The exact SPEC §9 copy for QT-A; other codes get the same wording with their own code. */
export const unmappedCopy = (code: string): string =>
  !code || code === 'QT-A'
    ? CRM_COPY.unmapped
    : `Sync paused: CRM programme code ${code} does not have an LMS mapping. Select the matching programme, preview the change and retry.`

function resultMessage(row: CrmEventRow): string {
  if (row.error) return row.error
  const result = String(row.payload.result ?? '')
  if (result.startsWith('existing_')) return CRM_COPY.retried
  if (result === 'approval_requested') {
    return 'Event processed. An enrolment request was created for approval; approval does not bypass capacity.'
  }
  return 'Event processed.'
}

const outcome = (row: CrmEventRow, message: string, duplicate = false): ProcessOutcome => ({
  eventId: row.eventId,
  status: row.status,
  message,
  duplicate,
})

function settle(
  row: CrmEventRow,
  status: CrmEventRow['status'],
  error: string | null,
  patch: Partial<CrmEventRow> = {},
): CrmEventRow['status'] {
  Object.assign(row, patch, {
    status,
    error,
    processedAt: status === 'processed' ? nowIso() : null,
    updatedAt: nowIso(),
  })
  return status
}

/** Processes (or retries) one event. A processed event is returned unchanged. */
export function processEvent(actor: AuditActor | null, row: CrmEventRow): ProcessOutcome {
  if (row.status === 'processed') {
    return outcome(row, 'Event already processed. Nothing was changed.', true)
  }
  const config = crmConfig()
  row.attempts += 1
  const before = row.status

  if (!ALLOWED[row.type].includes(row.direction)) {
    settle(
      row,
      'failed',
      `${row.type} events do not flow ${row.direction === 'crm_to_lms' ? 'from CRM to LMS' : 'from LMS to CRM'} in this configuration.`,
    )
  } else if (!config.enabledCategories.includes(row.type)) {
    settle(row, 'failed', `The ${row.type} event category is not enabled for this connection.`)
  } else if (row.direction === 'lms_to_crm') {
    deliverToCrm(row, config.paused, config.simulateOutage)
  } else if (config.paused) {
    settle(row, 'queued', CRM_COPY.paused)
  } else {
    applyInbound(actor, row)
  }

  recordAudit(actor, {
    action: 'crm.event.process',
    objectType: 'crm_event',
    objectId: row.eventId,
    before: { status: before },
    after: { status: row.status, attempts: row.attempts },
    reason: row.error,
  })
  return outcome(row, resultMessage(row))
}

function deliverToCrm(row: CrmEventRow, paused: boolean, outage: boolean): CrmEventRow['status'] {
  if (paused) return settle(row, 'queued', CRM_COPY.paused)
  if (outage) return settle(row, 'queued', CRM_COPY.outage)
  return settle(row, 'processed', null)
}

const isStatus = (value: unknown): value is LicenceStatus =>
  value === 'active' || value === 'expired' || value === 'suspended' || value === 'pending'

function applyInbound(actor: AuditActor | null, row: CrmEventRow): CrmEventRow['status'] {
  const match = matchLearner(row)
  if (match.state === 'review') {
    return settle(row, 'conflict', match.reason, {
      payload: { ...row.payload, identityReview: true },
    })
  }
  if (!row.learnerId) row.learnerId = match.learnerId
  if (row.type === 'enrolment') return applyEnrolment(actor, row, match.learnerId)
  if (row.type === 'licence') return applyLicence(actor, row, match.learnerId)
  // Examination (retake approval) and certification (external credential) are recorded and
  // routed to review; they never change results or issue anything by themselves.
  return settle(row, 'processed', null, {
    payload: { ...row.payload, routedTo: 'review', note: 'Recorded for Academy review.' },
  })
}

function applyEnrolment(
  actor: AuditActor | null,
  row: CrmEventRow,
  learnerId: string,
): CrmEventRow['status'] {
  const code = String(row.payload.programmeCode ?? '')
  const letter = lookupProgramme(fieldRows(), code)
  if (!letter) return settle(row, 'failed', unmappedCopy(code))

  const existing = enrolmentOf(learnerId, letter)
  const programme = db.programmes.find((p) => p.code === letter)
  const pending = db.approvalRequests.find(
    (r) =>
      r.type === 'enrolment' &&
      r.learnerId === learnerId &&
      r.programmeId === programme?.id &&
      (r.status === 'pending' || r.status === 'info_requested'),
  )
  const sessionCode = typeof row.payload.sessionCode === 'string' ? row.payload.sessionCode : null
  const session = sessionCode ? db.sessions.find((s) => s.code === sessionCode) : undefined
  const taken = session
    ? db.rsvps.filter(
        (r) => r.sessionId === session.id && (r.status === 'confirmed' || r.status === 'offered'),
      ).length
    : 0
  const full = Boolean(session && taken >= session.capacity)

  if (existing) {
    existing.lastActivityAt = nowIso()
    existing.updatedAt = nowIso()
    return settle(row, 'processed', null, {
      entityId: existing.id,
      payload: { ...row.payload, result: 'existing_enrolment_updated', capacityFull: full },
    })
  }
  if (pending) {
    // The earlier request is the record; the event updates it instead of adding another.
    pending.evidence = {
      ...pending.evidence,
      note: `${pending.evidence.note} · CRM event ${row.eventId}`.slice(0, 400),
    }
    pending.updatedAt = nowIso()
    return settle(row, 'processed', null, {
      entityId: pending.id,
      payload: { ...row.payload, result: 'existing_request_updated', capacityFull: full },
    })
  }
  const duplicate = db.approvalRequests.find((r) => r.evidence.note.includes(row.eventId))
  if (duplicate) {
    return settle(row, 'processed', null, { entityId: duplicate.id })
  }
  const request = insertRow('approvalRequests', {
    code: `REQ-${String(db.approvalRequests.length + 1).padStart(4, '0')}`,
    type: 'enrolment',
    learnerId,
    programmeId: programme?.id ?? null,
    sessionId: session?.id ?? null,
    submittedAt: nowIso(),
    evidence: { note: `Requested by the CRM · CRM event ${row.eventId}`, fileName: null },
  })
  recordAudit(actor, {
    action: 'crm.enrolment.request_created',
    objectType: 'approval_request',
    objectId: request.code,
    after: { programme: letter, source: 'crm', eventId: row.eventId, capacityFull: full },
    reason: 'Approval comes first; approval never bypasses capacity.',
  })
  return settle(row, 'processed', null, {
    entityId: request.id,
    payload: { ...row.payload, result: 'approval_requested', capacityFull: full },
  })
}

function applyLicence(
  actor: AuditActor | null,
  row: CrmEventRow,
  learnerId: string,
): CrmEventRow['status'] {
  const status = row.payload.licenceStatus
  if (!isStatus(status)) {
    return settle(row, 'failed', 'The licence status in the event is not one the LMS recognises.')
  }
  const current = db.licenceStatus.find((l) => l.learnerId === learnerId)
  const crmUpdatedAt = String(row.payload.crmUpdatedAt ?? row.occurredAt)
  if (current && Date.parse(crmUpdatedAt) < Date.parse(current.updatedAt)) {
    return settle(
      row,
      'conflict',
      'Stale CRM event: it is older than the licence status already held in the LMS, so it was not applied. Review and reconcile.',
    )
  }
  const stamp = row.payload.crmUpdatedAt ? crmUpdatedAt : nowIso()
  if (current) {
    Object.assign(current, { status, pendingRequest: null, updatedAt: stamp })
  } else {
    insertRow('licenceStatus', {
      learnerId,
      status,
      source: 'crm',
      pendingRequest: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
  }
  recordAudit(actor, {
    action: 'crm.licence.decision',
    objectType: 'licence_status',
    objectId: learnerId,
    before: { status: current?.status ?? null },
    after: { status, source: 'crm', eventId: row.eventId },
    reason: 'Licence status is decided by the CRM, the configured authority.',
  })
  return settle(row, 'processed', null, { entityId: learnerId })
}

/** Delivers every queued event (run demo sync). Failed and conflict events need an action. */
export function drainQueue(actor: AuditActor | null): ProcessOutcome[] {
  const config = crmConfig()
  if (config.paused) return []
  const queued = db.crmEvents
    .filter((e) => e.status === 'queued')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const results = queued.map((e) => processEvent(actor, e))
  if (!config.simulateOutage) patchCrmConfig({ lastSyncAt: nowIso() })
  return results
}
