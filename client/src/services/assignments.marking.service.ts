import { THRESHOLDS } from '@shared/constants'
import {
  type MarkingQueueQuery,
  markingCorrectionInput,
  markingDraftInput,
  markingFinalInput,
  markingQueueQuery,
  rubricFor,
  rubricTotal,
} from '@shared/schemas/assignment-marking'
import type { ReviewRow, SubmissionRow } from '@shared/types/db'
import { z } from 'zod'
import {
  ApiError,
  assertSubmissionInScope,
  commit,
  currentScope,
  DAY_MS,
  db,
  delay,
  insertRow,
  now,
  nowIso,
  out,
  parseInput,
  requireRole,
  type Scope,
  updateRow,
} from './api'
import {
  draftView,
  learnerIdentity,
  markerVersionView,
  rubricView,
  waiting,
} from './assignments/dto'
import {
  draftReview,
  finalReview,
  markingEvents,
  type SubmissionContext,
  submissionContext,
  trainerName,
  versionsOf,
} from './assignments/queries'
import { audit } from './audit.service'
import { notify } from './notifications.service'
import { recomputeEnrolment } from './progress.service'

/**
 * Trainer marking (brief §6, §10–11), formerly assignments.marking.service. Trainers and
 * admins only (assignments.policy MARKING_ROLES); every entry point checks the submission
 * against the viewer's scope, so a trainer who changes an id gets a 403, not another trainer's
 * work. Draft, finalise and correction are all audited.
 */

const idParam = z.object({ id: z.uuid() })

const STATUS_FILTER: Record<MarkingQueueQuery['status'], readonly string[] | null> = {
  open: ['submitted', 'under_review'],
  returned: ['returned'],
  approved: ['approved'],
  all: null,
}

const isOpen = (status: string) => status === 'submitted' || status === 'under_review'

/** The caller's marking scope: trainer or admin only, failing closed for anything else. */
function markingScope(): Exclude<Scope, { kind: 'self' }> {
  requireRole('trainer', 'admin')
  const scope = currentScope()
  if (scope.kind === 'self') throw ApiError.forbidden()
  return scope
}

type QueueRow = { submission: SubmissionRow; context: SubmissionContext }

/** The marking queue: filtered, counted and paged, oldest first for open work. */
export async function getQueue(input: Partial<MarkingQueueQuery> = {}) {
  await delay()
  const user = requireRole('trainer', 'admin')
  const scope = markingScope()
  const query = parseInput(markingQueueQuery, input, 'query')
  const search = query.search?.toLowerCase()

  const base: QueueRow[] = db.submissions
    .filter((s) => scope.kind === 'all' || s.markerTrainerId === scope.trainerId)
    .flatMap((submission) => {
      const context = submissionContext(submission.id)
      return context ? [{ submission, context }] : []
    })
    .filter(
      ({ context }) =>
        (!query.programme || context.programmeCode === query.programme) &&
        (!search ||
          context.learnerCode.toLowerCase().includes(search) ||
          context.learnerName.toLowerCase().includes(search)),
    )
  const statuses = STATUS_FILTER[query.status]
  const open = query.status === 'open'
  const matching = base
    .filter(({ submission }) => !statuses || statuses.includes(submission.status))
    .sort(
      (a, b) =>
        (open
          ? a.submission.submittedAt.localeCompare(b.submission.submittedAt)
          : b.submission.submittedAt.localeCompare(a.submission.submittedAt)) ||
        a.submission.id.localeCompare(b.submission.id),
    )
  const page = matching.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)

  const countOf = (list: readonly string[]) =>
    base.filter(({ submission }) => list.includes(submission.status)).length
  const overdueBefore = new Date(
    now().getTime() - THRESHOLDS.markingOverdueDays * DAY_MS,
  ).toISOString()

  return out({
    total: matching.length,
    page: query.page,
    pageSize: query.pageSize,
    counts: {
      open: countOf(['submitted', 'under_review']),
      returned: countOf(['returned']),
      approved: countOf(['approved']),
      all: countOf(['submitted', 'under_review', 'returned', 'approved']),
      overdue: base.filter(
        ({ submission }) => isOpen(submission.status) && submission.submittedAt < overdueBefore,
      ).length,
    },
    items: page.map(({ submission, context }) => {
      const openRow = isOpen(submission.status)
      return {
        id: submission.id,
        learner: learnerIdentity(user.role, context.learnerCode, context.learnerName),
        programmeCode: context.programmeCode,
        assignmentCode: context.assignment.code,
        assignmentTitle: context.assignment.title,
        version: submission.version,
        status: submission.status,
        format: submission.fileName
          ? submission.mimeType === 'video/mp4'
            ? ('video' as const)
            : ('document' as const)
          : ('text' as const),
        submittedAt: submission.submittedAt,
        ...waiting(submission.submittedAt, openRow),
        hasDraft: openRow && draftReview(submission.id) !== null,
        score: finalReview(submission.id)?.rubricScore ?? null,
      }
    }),
  })
}

function contextInScope(scope: Scope, submissionId: string): SubmissionContext {
  parseInput(idParam, { id: submissionId }, 'param')
  assertSubmissionInScope(scope, submissionId)
  const context = submissionContext(submissionId)
  if (!context) throw ApiError.notFound('Submission not found')
  return context
}

/** One submission to mark, with its versions (a trainer sees only those assigned to them). */
export async function getDetail(submissionId: string) {
  await delay()
  const user = requireRole('trainer', 'admin')
  const scope = markingScope()
  const context = contextInScope(scope, submissionId)
  const all = versionsOf(context.submission.assignmentId, context.submission.enrolmentId)
  const versions =
    scope.kind === 'trainer'
      ? all.filter((v) => v.submission.markerTrainerId === scope.trainerId)
      : all
  const events = markingEvents(versions.map((v) => v.submission.id))
  const current = versions.find((v) => v.submission.id === submissionId)
  return out({
    id: context.submission.id,
    learner: learnerIdentity(user.role, context.learnerCode, context.learnerName),
    programme: { code: context.programmeCode, title: context.programmeTitle },
    assignment: {
      code: context.assignment.code,
      title: context.assignment.title,
      brief: context.assignment.brief,
      wordMin: context.assignment.wordMin,
      wordMax: context.assignment.wordMax,
      passPercent: context.assignment.passPercent,
      rubric: rubricView(context.assignment.code),
    },
    markerName: trainerName(context.submission.markerTrainerId),
    isLatest: all[0]?.submission.id === submissionId,
    ...waiting(context.submission.submittedAt, isOpen(context.submission.status)),
    current: current ? markerVersionView(current, events) : null,
    draft: current?.review ? null : draftView(draftReview(submissionId)),
    versions: versions.map((v) => markerVersionView(v, events)),
  })
}

function checkedTotal(context: SubmissionContext, breakdown: Record<string, number>) {
  const rubric = rubricFor(context.assignment.code)
  for (const item of rubric) {
    const value = breakdown[item.key]
    if (value === undefined || value > item.max) {
      throw new ApiError(400, 'RUBRIC', `Score each rubric part from 0 to ${item.max}.`, {
        key: item.key,
      })
    }
  }
  const extra = Object.keys(breakdown).filter((key) => !rubric.some((item) => item.key === key))
  if (extra.length > 0) throw new ApiError(400, 'RUBRIC', 'Unknown rubric part', { extra })
  return rubricTotal(rubric, breakdown)
}

function assertDecisionFits(context: SubmissionContext, decision: string, total: number) {
  const pass = context.assignment.passPercent
  if (decision === 'approved' && total < pass) {
    throw new ApiError(
      400,
      'BELOW_PASS',
      `A mark of ${total} is below the pass mark of ${pass}. Return it for revision instead.`,
    )
  }
}

const alreadyFinal = () =>
  ApiError.conflict('ALREADY_FINAL', 'This mark is final. Use Correct mark with a reason.')

/** The one review row of a submission (draft or final), as the old unique index allowed. */
const reviewRowOf = (submissionId: string): ReviewRow | undefined =>
  db.reviews.find((r) => r.submissionId === submissionId)

/**
 * Saves a draft mark: audited, visible only to markers, never to the learner. Only a draft may
 * be overwritten: once the mark is final, a late draft save is refused.
 */
export async function saveDraft(submissionId: string, input: unknown) {
  await delay()
  const user = requireRole('trainer', 'admin')
  const scope = markingScope()
  const body = parseInput(markingDraftInput, input)
  const context = contextInScope(scope, submissionId)
  if (finalReview(submissionId)) throw alreadyFinal()
  const total = rubricTotal(rubricFor(context.assignment.code), body.breakdown)
  const savedAt = nowIso()
  const values = {
    reviewerId: user.id,
    rubricScore: total,
    rubricBreakdown: body.breakdown,
    feedback: body.feedback ?? '',
    status: 'draft' as const,
    draftDecision: body.decision ?? null,
    reviewedAt: savedAt,
  }
  const before = { status: context.submission.status }
  const existing = reviewRowOf(submissionId)
  if (existing) updateRow(existing, values)
  else insertRow('reviews', { ...values, submissionId })
  if (context.submission.status === 'submitted') {
    updateRow(context.submission, { status: 'under_review' })
  }
  audit({
    action: 'marking.draft',
    objectType: 'submission',
    objectId: submissionId,
    before,
    after: {
      breakdown: body.breakdown,
      total,
      feedback: body.feedback,
      decision: body.decision ?? null,
    },
  })
  commit()
  return { savedAt, total }
}

function firstName(full: string) {
  return full.split(' ')[0] ?? full
}

function decisionMessage(context: SubmissionContext, decision: string, total: number) {
  const name = firstName(context.learnerName)
  const title = context.assignment.title
  return decision === 'returned'
    ? {
        kind: 'assignment_returned',
        subject: 'Your assignment has been returned for revision',
        body: `Hello ${name}, your trainer has returned your submission with feedback. Please review it in Assignments and submit a revised version.`,
      }
    : {
        kind: 'assignment_approved',
        subject: `Your assignment has been approved: ${title}`,
        body: `Hello ${name}, your trainer has approved version ${context.submission.version} of ${title} with a mark of ${total}/100. You can read the feedback in Assignments.`,
      }
}

/**
 * Finalises a mark: return for revision or approve. Retrying the same request is safe: it
 * changes nothing and the notification's event id dedupes, so no second message is sent.
 */
export async function finalise(submissionId: string, input: unknown) {
  await delay()
  const user = requireRole('trainer', 'admin')
  const scope = markingScope()
  const body = parseInput(markingFinalInput, input)
  const context = contextInScope(scope, submissionId)
  const total = checkedTotal(context, body.breakdown)
  assertDecisionFits(context, body.decision, total)

  const current = finalReview(submissionId)
  if (current) {
    const same =
      current.status === body.decision &&
      current.rubricScore === total &&
      current.feedback === body.feedback
    if (!same) throw alreadyFinal()
  }
  const reviewedAt = nowIso()
  const message = decisionMessage(context, body.decision, total)

  if (!current) {
    // A saved draft becomes the final review; otherwise the final review is new.
    const values = {
      reviewerId: user.id,
      rubricScore: total,
      rubricBreakdown: body.breakdown,
      feedback: body.feedback,
      status: body.decision,
      draftDecision: null,
      reviewedAt,
    }
    const draft = draftReview(submissionId)
    if (draft) updateRow(draft, values)
    else insertRow('reviews', { ...values, submissionId })
    const before = context.submission.status
    updateRow(context.submission, { status: body.decision })
    audit({
      action: 'marking.finalise',
      objectType: 'submission',
      objectId: submissionId,
      before: { status: before },
      after: { status: body.decision, score: total },
    })
  }
  notify({
    eventId: `evt-review-${submissionId}`,
    kind: message.kind,
    recipientIds: [context.submission.learnerId],
    subject: message.subject,
    body: message.body,
    actorId: user.id,
  })
  recomputeEnrolment(context.submission.learnerId, context.programmeCode)
  commit()
  return { status: body.decision, total, unchanged: Boolean(current) }
}

/**
 * Corrects a finalised mark (brief §10): needs a reason and writes an audit entry with the
 * before and after summary. The decision can change only on the learner's latest version.
 */
export async function correct(submissionId: string, input: unknown) {
  await delay()
  const user = requireRole('trainer', 'admin')
  const scope = markingScope()
  const body = parseInput(markingCorrectionInput, input)
  const context = contextInScope(scope, submissionId)
  const current = finalReview(submissionId)
  if (!current) {
    throw ApiError.conflict('NOT_FINAL', 'This mark is not final yet. Save or finalise it instead.')
  }
  const total = checkedTotal(context, body.breakdown)
  assertDecisionFits(context, body.decision, total)

  if (
    current.status === body.decision &&
    current.rubricScore === total &&
    current.feedback === body.feedback &&
    rubricFor(context.assignment.code).every(
      (item) => current.rubricBreakdown?.[item.key] === body.breakdown[item.key],
    )
  ) {
    return { status: current.status, total, unchanged: true }
  }
  if (current.status !== body.decision) {
    const versions = versionsOf(context.submission.assignmentId, context.submission.enrolmentId)
    if (versions[0]?.submission.id !== submissionId) {
      throw new ApiError(
        400,
        'NOT_LATEST',
        'The learner has submitted a newer version. Correct the score or feedback only.',
      )
    }
  }

  const sequence =
    db.auditEvents.filter((e) => e.action === 'marking.correct' && e.objectId === submissionId)
      .length + 1
  const before = { status: current.status, score: current.rubricScore }

  updateRow(current, {
    rubricScore: total,
    rubricBreakdown: body.breakdown,
    feedback: body.feedback,
    status: body.decision,
  })
  updateRow(context.submission, { status: body.decision })
  audit({
    action: 'marking.correct',
    objectType: 'submission',
    objectId: submissionId,
    before,
    after: { status: body.decision, score: total },
    reason: body.reason,
  })
  notify({
    eventId: `evt-correct-${submissionId}-${sequence}`,
    kind: 'assignment_mark_corrected',
    recipientIds: [context.submission.learnerId],
    subject: `Your assignment mark has been updated: ${context.assignment.title}`,
    body: `Hello ${firstName(context.learnerName)}, your trainer has corrected the mark for version ${context.submission.version} of ${context.assignment.title}. Your mark is now ${total}/100. You can review it in Assignments.`,
    actorId: user.id,
  })
  recomputeEnrolment(context.submission.learnerId, context.programmeCode)
  commit()
  return { status: body.decision, total, unchanged: false }
}

export type MarkingQueue = Awaited<ReturnType<typeof getQueue>>
export type MarkingDetail = Awaited<ReturnType<typeof getDetail>>
