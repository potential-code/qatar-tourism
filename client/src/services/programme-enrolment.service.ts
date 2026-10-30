import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import { programmeCodeParam } from '@shared/schemas/profile-account'
import { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  nowIso,
  out,
  parseInput,
  requireRole,
  requireUser,
} from './api'
import { recordAudit } from './audit.service'
import { enrol, enrolmentOf, listOwnEnrolments } from './enrolment/core'
import { notify } from './notifications.service'

/**
 * Joining a programme from the public pages (brief §3 routing), formerly the enrolment routes
 * of server/modules/programmes (programmes.controller + programmes.policy).
 */

/** Only a learner account can enrol itself. Trainers and admins never become learners here. */
const SELF_ENROL_ROLES: readonly Role[] = ['learner']

/** Programmes a learner may join from the public site. C is an illustrative sample only. */
const SELF_ENROL_PROGRAMMES: readonly ProgrammeCode[] = ['A', 'B']

function assertCanSelfEnrol(role: Role, code: ProgrammeCode): void {
  if (!SELF_ENROL_ROLES.includes(role)) {
    throw ApiError.forbidden('Only learner accounts can enrol on a programme')
  }
  if (!SELF_ENROL_PROGRAMMES.includes(code)) {
    throw new ApiError(
      409,
      'PROGRAMME_ILLUSTRATIVE',
      'Program C is an illustrative sample programme and does not take enrolments.',
    )
  }
}

/** The signed-in learner's enrolments; empty for staff. */
export async function listMyEnrolments() {
  await delay()
  const user = requireUser()
  return out(user.role === 'learner' ? listOwnEnrolments(user.id) : [])
}

export type OwnEnrolment = Awaited<ReturnType<typeof listMyEnrolments>>[number]

/** Join Program A (or B). Idempotent: a second click returns the existing enrolment. */
export async function enrolSelf(code: ProgrammeCode) {
  await delay()
  const user = requireUser()
  const parsed = parseInput(programmeCodeParam, { code }, 'param').code
  assertCanSelfEnrol(user.role, parsed)
  const result = enrol({ id: user.id, role: user.role, name: user.name }, user.id, parsed)
  commit()
  return { programme: parsed, ...result }
}

// ---------------------------------------------------------------------------------------------
// Enrolment that needs Academy approval (SPEC §5)
// ---------------------------------------------------------------------------------------------

const requestInput = z.object({
  sessionId: z.uuid().optional(),
  note: z.string().trim().max(300).optional(),
})

const OPEN_STATUSES: readonly string[] = ['pending', 'info_requested']

/** Next display id: REQ-0001, REQ-0002 ... */
function nextRequestCode(): string {
  const highest = db.approvalRequests.reduce(
    (max, r) => Math.max(max, Number.parseInt(r.code.replace('REQ-', ''), 10) || 0),
    0,
  )
  return `REQ-${String(highest + 1).padStart(4, '0')}`
}

/**
 * Asks to join a programme that needs approval. Approval comes first: the request waits for an
 * administrator, and only then does the learner enrol and (for a named session) book or join the
 * waitlist. It never bypasses capacity.
 */
export async function requestEnrolment(
  code: ProgrammeCode,
  input: z.input<typeof requestInput> = {},
) {
  await delay()
  const learner = requireRole('learner')
  const parsed = parseInput(programmeCodeParam, { code }, 'param').code
  assertCanSelfEnrol(learner.role, parsed)
  const body = parseInput(requestInput, input)
  const programme = db.programmes.find((p) => p.code === parsed)
  if (!programme) throw ApiError.notFound('Programme not found')
  if (enrolmentOf(learner.id, parsed)) {
    throw ApiError.conflict('ALREADY_ENROLLED', `You are already enrolled in Program ${parsed}.`)
  }
  const open = db.approvalRequests.find(
    (r) =>
      r.type === 'enrolment' &&
      r.learnerId === learner.id &&
      r.programmeId === programme.id &&
      OPEN_STATUSES.includes(r.status),
  )
  if (open) {
    throw ApiError.conflict('REQUEST_OPEN', `Request ${open.code} is already waiting for review.`)
  }
  const admins = db.users.filter((u) => u.role === 'admin')
  const request = insertRow('approvalRequests', {
    code: nextRequestCode(),
    type: 'enrolment',
    learnerId: learner.id,
    programmeId: programme.id,
    sessionId: body.sessionId ?? null,
    externalCertificateId: null,
    submittedAt: nowIso(),
    reviewerId: admins[0]?.id ?? null,
    evidence: { note: body.note || 'Requested by the learner', fileName: null },
    status: 'pending',
    reason: null,
    decidedAt: null,
    decidedBy: null,
  })
  recordAudit(learner, {
    action: 'approval.submit',
    objectType: 'approval_request',
    objectId: request.code,
    after: { type: 'enrolment', programme: parsed, status: 'pending' },
  })
  notify({
    eventId: `evt-approval-submitted-${request.code}`,
    kind: 'approval_submitted',
    recipientIds: admins.map((a) => a.id),
    subject: `New enrolment request ${request.code}`,
    body: `A learner asked to join Program ${parsed}. Review it under Enrolments and Approvals.`,
    actorId: learner.id,
  })
  commit()
  return { code: request.code, status: request.status }
}

const NEXT_STEP: Record<string, string> = {
  pending: 'The Academy is reviewing your request. You do not need to do anything yet.',
  info_requested: 'Reply with the information the Academy asked for to continue.',
  approved: 'Approved. Your programme is open. Book a session in My sessions.',
  rejected: 'You can fix the issue and send a new request.',
}

/** The learner's own approval requests (enrolment and external certificate) with status, reason and next step. */
export async function listMyRequests() {
  await delay()
  const learner = requireRole('learner')
  const items = db.approvalRequests
    .filter((r) => r.learnerId === learner.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((r) => {
      const programme = db.programmes.find((p) => p.id === r.programmeId)
      const cert = db.externalCertificates.find((c) => c.id === r.externalCertificateId)
      return {
        code: r.code,
        type: r.type,
        status: r.status,
        programme: programme?.code ?? null,
        certificateTitle: cert?.title ?? null,
        submittedAt: r.submittedAt,
        reason: r.status === 'pending' ? null : r.reason,
        nextStep: NEXT_STEP[r.status] ?? '',
        decidedAt: r.decidedAt,
      }
    })
  return out({ items })
}

export type MyRequest = Awaited<ReturnType<typeof listMyRequests>>['items'][number]

/** Learner answers an information request: the note joins the evidence and the request returns to review. */
export async function respondToInfoRequest(code: string, note: string) {
  await delay()
  const learner = requireRole('learner')
  const text = parseInput(z.string().trim().min(5, 'Write at least 5 characters').max(300), note)
  const request = db.approvalRequests.find((r) => r.code === code && r.learnerId === learner.id)
  if (!request) throw ApiError.notFound('Request not found')
  if (request.status !== 'info_requested') {
    throw ApiError.conflict('NOT_WAITING', 'This request is not waiting for information.')
  }
  Object.assign(request, {
    status: 'pending',
    evidence: { ...request.evidence, note: `${request.evidence.note} | Learner reply: ${text}` },
  })
  recordAudit(learner, {
    action: 'approval.reply',
    objectType: 'approval_request',
    objectId: request.code,
    before: { status: 'info_requested' },
    after: { status: 'pending' },
    reason: text,
  })
  commit()
  return { code: request.code, status: request.status }
}
