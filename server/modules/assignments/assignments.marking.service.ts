import { db } from '@server/db/connection'
import {
  assignments,
  auditEvents,
  profiles,
  programmes,
  reviews,
  submissions,
  trainerProfiles,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import { assertSubmissionInScope, type Scope } from '@server/middleware/scope.middleware'
import { recordAudit } from '@server/modules/audit/audit.service'
import { notify } from '@server/modules/notifications/notifications.service'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import { THRESHOLDS } from '@shared/constants'
import {
  type MarkingCorrectionInput,
  type MarkingDraftInput,
  type MarkingFinalInput,
  type MarkingQueueQuery,
  rubricFor,
  rubricTotal,
} from '@shared/schemas/assignment-marking'
import { and, asc, count, desc, eq, ilike, inArray, lt, or, type SQL } from 'drizzle-orm'
import {
  markingEvents,
  type SubmissionContext,
  submissionContext,
  versionsOf,
} from './assignments.queries'

/**
 * Trainer marking (brief §6, §10–11). Every entry point checks the submission against the
 * viewer's scope at the data layer: a trainer who changes an id in the URL gets a 403, not
 * another trainer's work. Draft, finalise and correction are all audited.
 */

/** Who is marking, and the request id that ties the audit entry to the request log. */
export type MarkingActor = { viewer: Viewer; requestId?: string }

const STATUS_FILTER: Record<MarkingQueueQuery['status'], readonly string[] | null> = {
  open: ['submitted', 'under_review'],
  returned: ['returned'],
  approved: ['approved'],
  all: null,
}

function scopeCondition(scope: Scope): SQL | undefined {
  if (scope.kind === 'all') return undefined
  if (scope.kind === 'trainer') return eq(submissions.markerTrainerId, scope.trainerId)
  // Learners never reach the marking endpoints (role check), but fail closed regardless.
  throw HttpError.forbidden()
}

export async function queue(scope: Scope, query: MarkingQueueQuery) {
  const base = and(
    scopeCondition(scope),
    query.programme ? eq(programmes.code, query.programme) : undefined,
    query.search
      ? or(
          ilike(profiles.learnerCode, `%${query.search}%`),
          ilike(profiles.fullName, `%${query.search}%`),
        )
      : undefined,
  )
  const statuses = STATUS_FILTER[query.status]
  const where = and(
    base,
    statuses ? inArray(submissions.status, [...statuses] as never) : undefined,
  )
  const open = query.status === 'open'

  const from = () =>
    db
      .select({
        submission: submissions,
        assignmentCode: assignments.code,
        assignmentTitle: assignments.title,
        programmeCode: programmes.code,
        learnerCode: profiles.learnerCode,
        learnerName: profiles.fullName,
        review: reviews,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(programmes, eq(programmes.id, assignments.programmeId))
      .innerJoin(profiles, eq(profiles.userId, submissions.learnerId))
      .leftJoin(reviews, eq(reviews.submissionId, submissions.id))

  const overdueBefore = new Date(now().getTime() - THRESHOLDS.markingOverdueDays * 86_400_000)
  const [items, totals, statusCounts, overdue] = await Promise.all([
    from()
      .where(where)
      .orderBy(
        open ? asc(submissions.submittedAt) : desc(submissions.submittedAt),
        asc(submissions.id),
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db
      .select({ total: count() })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(programmes, eq(programmes.id, assignments.programmeId))
      .innerJoin(profiles, eq(profiles.userId, submissions.learnerId))
      .where(where),
    db
      .select({ status: submissions.status, total: count() })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(programmes, eq(programmes.id, assignments.programmeId))
      .innerJoin(profiles, eq(profiles.userId, submissions.learnerId))
      .where(base)
      .groupBy(submissions.status),
    db
      .select({ total: count() })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(programmes, eq(programmes.id, assignments.programmeId))
      .innerJoin(profiles, eq(profiles.userId, submissions.learnerId))
      .where(
        and(
          base,
          inArray(submissions.status, ['submitted', 'under_review']),
          lt(submissions.submittedAt, overdueBefore),
        ),
      ),
  ])

  const drafted = await db
    .select({ objectId: auditEvents.objectId })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, 'marking.draft'),
        inArray(
          auditEvents.objectId,
          items.map((i) => i.submission.id),
        ),
      ),
    )
  return {
    items,
    total: totals[0]?.total ?? 0,
    statusCounts,
    overdue: overdue[0]?.total ?? 0,
    draftedIds: new Set(drafted.map((d) => d.objectId)),
  }
}

async function contextInScope(scope: Scope, submissionId: string): Promise<SubmissionContext> {
  await assertSubmissionInScope(scope, submissionId)
  const context = await submissionContext(submissionId)
  if (!context) throw HttpError.notFound('Submission not found')
  return context
}

export async function detail(scope: Scope, submissionId: string) {
  const context = await contextInScope(scope, submissionId)
  const all = await versionsOf(context.submission.assignmentId, context.submission.enrolmentId)
  // A trainer sees only the versions assigned to them.
  const versions =
    scope.kind === 'trainer'
      ? all.filter((v) => v.submission.markerTrainerId === scope.trainerId)
      : all
  const events = await markingEvents(versions.map((v) => v.submission.id))
  const [marker] = context.submission.markerTrainerId
    ? await db
        .select({ name: trainerProfiles.fullName })
        .from(trainerProfiles)
        .where(eq(trainerProfiles.id, context.submission.markerTrainerId))
    : []
  return {
    context,
    versions,
    events,
    markerName: marker?.name ?? null,
    isLatest: all[0]?.submission.id === submissionId,
  }
}

function checkedTotal(context: SubmissionContext, breakdown: Record<string, number>) {
  const rubric = rubricFor(context.assignment.code)
  for (const item of rubric) {
    const value = breakdown[item.key]
    if (value === undefined || value > item.max) {
      throw new HttpError(400, 'RUBRIC', `Score each rubric part from 0 to ${item.max}.`, {
        key: item.key,
      })
    }
  }
  const extra = Object.keys(breakdown).filter((key) => !rubric.some((item) => item.key === key))
  if (extra.length > 0) throw new HttpError(400, 'RUBRIC', 'Unknown rubric part', { extra })
  return rubricTotal(rubric, breakdown)
}

function assertDecisionFits(context: SubmissionContext, decision: string, total: number) {
  const pass = context.assignment.passPercent
  if (decision === 'approved' && total < pass) {
    throw new HttpError(
      400,
      'BELOW_PASS',
      `A mark of ${total} is below the pass mark of ${pass}. Return it for revision instead.`,
    )
  }
}

async function existingReview(submissionId: string) {
  const [row] = await db.select().from(reviews).where(eq(reviews.submissionId, submissionId))
  return row ?? null
}

/** Saves a draft mark: audited, visible only to markers, never to the learner. */
export async function saveDraft(
  actor: MarkingActor,
  scope: Scope,
  submissionId: string,
  input: MarkingDraftInput,
) {
  const context = await contextInScope(scope, submissionId)
  if (await existingReview(submissionId)) {
    throw new HttpError(409, 'ALREADY_FINAL', 'This mark is final. Use Correct mark with a reason.')
  }
  const rubric = rubricFor(context.assignment.code)
  const total = rubricTotal(rubric, input.breakdown)
  const savedAt = now()
  await db.transaction(async (tx) => {
    if (context.submission.status === 'submitted') {
      await tx
        .update(submissions)
        .set({ status: 'under_review', updatedAt: savedAt })
        .where(eq(submissions.id, submissionId))
    }
    await recordAudit(
      actor.viewer,
      {
        action: 'marking.draft',
        objectType: 'submission',
        objectId: submissionId,
        before: { status: context.submission.status },
        after: {
          breakdown: input.breakdown,
          total,
          feedback: input.feedback,
          decision: input.decision ?? null,
        },
      },
      tx,
      actor.requestId,
    )
  })
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
export async function finalise(
  actor: MarkingActor,
  scope: Scope,
  submissionId: string,
  input: MarkingFinalInput,
) {
  const context = await contextInScope(scope, submissionId)
  const total = checkedTotal(context, input.breakdown)
  assertDecisionFits(context, input.decision, total)

  const current = await existingReview(submissionId)
  if (current) {
    const same =
      current.status === input.decision &&
      current.rubricScore === total &&
      current.feedback === input.feedback
    if (!same) {
      throw new HttpError(
        409,
        'ALREADY_FINAL',
        'This mark is final. Use Correct mark with a reason.',
      )
    }
  }
  const reviewedAt = now()
  const message = decisionMessage(context, input.decision, total)

  await db.transaction(async (tx) => {
    if (!current) {
      await tx.insert(reviews).values({
        submissionId,
        reviewerId: actor.viewer.id,
        rubricScore: total,
        rubricBreakdown: input.breakdown,
        feedback: input.feedback,
        status: input.decision,
        reviewedAt,
        createdAt: reviewedAt,
        updatedAt: reviewedAt,
      })
      await tx
        .update(submissions)
        .set({ status: input.decision, updatedAt: reviewedAt })
        .where(eq(submissions.id, submissionId))
      await recordAudit(
        actor.viewer,
        {
          action: 'marking.finalise',
          objectType: 'submission',
          objectId: submissionId,
          before: { status: context.submission.status },
          after: { status: input.decision, score: total },
        },
        tx,
        actor.requestId,
      )
    }
    await notify(
      {
        eventId: `evt-review-${submissionId}`,
        kind: message.kind,
        recipientIds: [context.submission.learnerId],
        subject: message.subject,
        body: message.body,
        actorId: actor.viewer.id,
      },
      tx,
    )
    await recomputeEnrolment(context.submission.learnerId, context.programmeCode, tx)
  })
  return { status: input.decision, total, reviewedAt, unchanged: Boolean(current) }
}

/**
 * Corrects a finalised mark (brief §10): needs a reason and writes an audit entry with the
 * before and after summary. The decision can change only on the learner's latest version.
 */
export async function correct(
  actor: MarkingActor,
  scope: Scope,
  submissionId: string,
  input: MarkingCorrectionInput,
) {
  const context = await contextInScope(scope, submissionId)
  const current = await existingReview(submissionId)
  if (!current) {
    throw new HttpError(
      409,
      'NOT_FINAL',
      'This mark is not final yet. Save or finalise it instead.',
    )
  }
  const total = checkedTotal(context, input.breakdown)
  assertDecisionFits(context, input.decision, total)

  if (
    current.status === input.decision &&
    current.rubricScore === total &&
    current.feedback === input.feedback &&
    rubricFor(context.assignment.code).every(
      (item) => current.rubricBreakdown?.[item.key] === input.breakdown[item.key],
    )
  ) {
    return { status: current.status, total, unchanged: true }
  }
  if (current.status !== input.decision) {
    const versions = await versionsOf(
      context.submission.assignmentId,
      context.submission.enrolmentId,
    )
    if (versions[0]?.submission.id !== submissionId) {
      throw new HttpError(
        400,
        'NOT_LATEST',
        'The learner has submitted a newer version. Correct the score or feedback only.',
      )
    }
  }

  const correctedAt = now()
  const [priorCorrections] = await db
    .select({ total: count() })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, 'marking.correct'), eq(auditEvents.objectId, submissionId)))
  const sequence = (priorCorrections?.total ?? 0) + 1

  await db.transaction(async (tx) => {
    await tx
      .update(reviews)
      .set({
        rubricScore: total,
        rubricBreakdown: input.breakdown,
        feedback: input.feedback,
        status: input.decision,
        updatedAt: correctedAt,
      })
      .where(eq(reviews.id, current.id))
    await tx
      .update(submissions)
      .set({ status: input.decision, updatedAt: correctedAt })
      .where(eq(submissions.id, submissionId))
    await recordAudit(
      actor.viewer,
      {
        action: 'marking.correct',
        objectType: 'submission',
        objectId: submissionId,
        before: { status: current.status, score: current.rubricScore },
        after: { status: input.decision, score: total },
        reason: input.reason,
      },
      tx,
      actor.requestId,
    )
    await notify(
      {
        eventId: `evt-correct-${submissionId}-${sequence}`,
        kind: 'assignment_mark_corrected',
        recipientIds: [context.submission.learnerId],
        subject: `Your assignment mark has been updated: ${context.assignment.title}`,
        body: `Hello ${firstName(context.learnerName)}, your trainer has corrected the mark for version ${context.submission.version} of ${context.assignment.title}. Your mark is now ${total}/100. You can review it in Assignments.`,
        actorId: actor.viewer.id,
      },
      tx,
    )
    await recomputeEnrolment(context.submission.learnerId, context.programmeCode, tx)
  })
  return { status: input.decision, total, unchanged: false }
}
