import type { CrmEventType } from '@shared/constants'
import { crmLearnerId } from '@shared/utils/identity'
import { db } from '../api'
import type { AuditActor } from '../audit.service'
import { type ProcessOutcome, submitEvent } from './events'

/**
 * LMS to CRM reporting (SPEC §8 Events, §9). One entry point for every service that reports an
 * LMS event: approvals, assessment results, completions, certification and licence review
 * requests. Each call carries a dedupe key, so the same fact is stored once in the sync log
 * however often the caller runs (retries, recomputes, second page loads). Synchronous; the
 * calling service commits.
 */

export type LmsEventInput = {
  /** Stable key of the fact being reported. The same key never creates a second event. */
  dedupeKey: string
  type: CrmEventType
  learnerId: string
  entityId?: string | null
  payload: Record<string, unknown>
  /**
   * Linked learners only (default). Certification events also report for learners without a CRM
   * link, using the stable derived id, so credential changes always reach the log.
   */
  allowUnlinked?: boolean
}

const currentActor = (): AuditActor | null => {
  const user = db.users.find((u) => u.id === db.session?.userId)
  return user ? { id: user.id, role: user.role, name: user.name } : null
}

const outcomeOf = (row: (typeof db.crmEvents)[number]): ProcessOutcome => ({
  eventId: row.eventId,
  status: row.status,
  message: 'Event already recorded. Nothing was added.',
  duplicate: true,
})

export function findLmsEvent(dedupeKey: string) {
  return db.crmEvents.find((e) => e.payload.dedupeKey === dedupeKey)
}

/** Records the event once and tries to deliver it. Null when the learner has no CRM link. */
export function reportLmsEvent(input: LmsEventInput): ProcessOutcome | null {
  const existing = findLmsEvent(input.dedupeKey)
  if (existing) return outcomeOf(existing)
  const link = db.crmMappings.find((m) => m.kind === 'learner' && m.learnerId === input.learnerId)
  let externalLearnerId = link?.externalLearnerId ?? null
  if (!externalLearnerId && input.allowUnlinked) {
    const profile = db.profiles.find((p) => p.userId === input.learnerId)
    externalLearnerId = profile ? crmLearnerId(profile.learnerCode) : null
  }
  if (!externalLearnerId) return null
  return submitEvent(currentActor(), {
    type: input.type,
    direction: 'lms_to_crm',
    learnerId: input.learnerId,
    externalLearnerId,
    entityId: input.entityId ?? null,
    payload: { dedupeKey: input.dedupeKey, ...input.payload },
  })
}

/** The CRM programme code for a programme letter, for example A to QT-A. */
export const crmProgrammeCode = (letter: string): string => `QT-${letter}`

export type EnrolmentAck = 'approved' | 'waitlisted' | 'rejected'

/** Acknowledges an enrolment decision to the CRM. Once per learner, programme and decision. */
export function ackKey(learnerId: string, letter: string, decision: EnrolmentAck): string {
  return `enrol-ack:${learnerId}:${letter}:${decision}`
}

export function reportEnrolmentAck(input: {
  learnerId: string
  programmeLetter: string
  decision: EnrolmentAck
  entityId?: string | null
  requestCode?: string
}): ProcessOutcome | null {
  return reportLmsEvent({
    dedupeKey: ackKey(input.learnerId, input.programmeLetter, input.decision),
    type: 'enrolment',
    learnerId: input.learnerId,
    entityId: input.entityId ?? null,
    payload: {
      acknowledgement: input.decision,
      programmeCode: crmProgrammeCode(input.programmeLetter),
      ...(input.requestCode ? { requestCode: input.requestCode } : {}),
    },
  })
}

export function reportCompletion(input: {
  learnerId: string
  programmeLetter: string
  enrolmentId: string
  courseCode?: string
}): ProcessOutcome | null {
  const course = input.courseCode
  return reportLmsEvent({
    dedupeKey: course
      ? `completion:course:${input.enrolmentId}:${course}`
      : `completion:${input.enrolmentId}`,
    type: 'completion',
    learnerId: input.learnerId,
    entityId: input.enrolmentId,
    payload: {
      programmeCode: crmProgrammeCode(input.programmeLetter),
      status: 'completed',
      scope: course ? 'course' : 'programme',
      ...(course ? { courseCode: course } : {}),
      simulated: false,
    },
  })
}

export function reportExamResult(input: {
  learnerId: string
  attemptId: string
  kind: string
  scorePercent: number | null
  /** Null when the assessment has no pass gate (pre-assessment). */
  passPercent: number | null
  programmeLetter: string
}): ProcessOutcome | null {
  const score = input.scorePercent
  const result =
    input.passPercent === null || score === null
      ? 'recorded'
      : score >= input.passPercent
        ? 'pass'
        : 'fail'
  return reportLmsEvent({
    dedupeKey: `exam:${input.attemptId}`,
    type: 'examination',
    learnerId: input.learnerId,
    entityId: input.attemptId,
    payload: {
      attemptId: input.attemptId,
      assessmentKind: input.kind,
      programmeCode: crmProgrammeCode(input.programmeLetter),
      scorePercent: score,
      passPercent: input.passPercent,
      result,
      simulated: false,
    },
  })
}
