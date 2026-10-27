import { db } from '@server/db/connection'
import { courses, enrolments, unitProgress } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import {
  C03_QUESTIONS,
  C05_CHECKLIST,
  C05_MIN_DRAFT_WORDS,
} from '@server/modules/courses/unit-content'
import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import { COURSE_BY_CODE } from '@shared/content/curriculum'
import type {
  BranchingBody,
  FormativeAnswerBody,
  ResourceBody,
  VideoProgressBody,
} from '@shared/schemas/learning-engine'
import { and, eq } from 'drizzle-orm'
import { type EnrolmentContext, findEnrolment } from './progress.evidence'
import { recomputeEnrolment } from './progress.service'

/**
 * Learner unit events (brief §7): video watched, branching preview, formative check, resource
 * and preview. Each runs in one transaction: write the unit, touch the enrolment's last
 * activity, then recompute the enrolment. A unit's `completed_at` is written once.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type UnitRow = typeof unitProgress.$inferSelect

/** The learner's enrolment, and a check that the course belongs to that programme. */
export async function requireUnitContext(
  tx: Tx,
  learnerId: string,
  programme: ProgrammeCode,
  courseCode: string,
) {
  const course = COURSE_BY_CODE[courseCode]
  if (!course?.programmes.includes(programme)) {
    throw HttpError.notFound('This unit is not part of the programme')
  }
  const enrolment = await findEnrolment(tx, learnerId, programme)
  if (!enrolment) throw HttpError.notFound('You are not enrolled in this programme')
  const [courseRow] = await tx
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.code, courseCode))
    .limit(1)
  if (!courseRow) throw HttpError.notFound('Unit not found')
  const [unit] = await tx
    .select()
    .from(unitProgress)
    .where(and(eq(unitProgress.enrolmentId, enrolment.id), eq(unitProgress.courseId, courseRow.id)))
    .limit(1)
  return { enrolment, courseId: courseRow.id, unit: unit ?? null }
}

type UnitPatch = Partial<
  Pick<
    UnitRow,
    | 'status'
    | 'percent'
    | 'scoreRaw'
    | 'cmiCompletionStatus'
    | 'cmiSuccessStatus'
    | 'sessionTimeSeconds'
    | 'suspendData'
    | 'location'
    | 'extra'
  >
> & { complete?: boolean }

/**
 * Writes a unit. `complete: true` completes it, and the first completion is the only one that
 * sets `completed_at`: a second pass never counts twice. A completed unit is never reopened.
 * Returns whether this call was the one that completed the unit.
 */
export async function writeUnit(
  tx: Tx,
  ctx: { enrolment: EnrolmentContext; courseId: string; unit: UnitRow | null },
  patch: UnitPatch,
): Promise<{ completedNow: boolean; unit: UnitRow }> {
  const instant = now()
  const wasComplete = ctx.unit?.status === 'completed'
  const completeNow = Boolean(patch.complete) && !wasComplete
  const { complete: _complete, ...fields } = patch
  const status = wasComplete || completeNow ? 'completed' : (fields.status ?? 'in_progress')
  const values = {
    ...fields,
    status,
    percent: status === 'completed' ? 100 : Math.max(ctx.unit?.percent ?? 0, fields.percent ?? 0),
    completedAt: ctx.unit?.completedAt ?? (completeNow ? instant : null),
    lastActivityAt: instant,
  } as const
  const [unit] = ctx.unit
    ? await tx.update(unitProgress).set(values).where(eq(unitProgress.id, ctx.unit.id)).returning()
    : await tx
        .insert(unitProgress)
        .values({ enrolmentId: ctx.enrolment.id, courseId: ctx.courseId, ...values })
        .returning()
  await tx
    .update(enrolments)
    .set({ lastActivityAt: instant })
    .where(eq(enrolments.id, ctx.enrolment.id))
  return { completedNow: completeNow, unit: unit as UnitRow }
}

async function finish(tx: Tx, learnerId: string, programme: ProgrammeCode) {
  const status = await recomputeEnrolment(learnerId, programme, tx)
  return { enrolmentStatus: status }
}

const extraOf = (unit: UnitRow | null) => (unit?.extra ?? {}) as Record<string, unknown>

// ---------------------------------------------------------------------------------------------

/** C01: complete at 90 percent watched. C03: the video is tracked; its questions complete it. */
export async function recordVideo(learnerId: string, body: VideoProgressBody) {
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, body.programme, body.courseCode)
    const extra = extraOf(ctx.unit)
    const watched = Math.max(Number(extra.videoPercent ?? 0), Math.round(body.watchedPercent))
    const reached = watched >= THRESHOLDS.videoCompletePercent
    const nextExtra = {
      ...extra,
      videoPercent: watched,
      positionSeconds: body.positionSeconds ?? 0,
    }
    const result =
      body.courseCode === 'C01'
        ? await writeUnit(tx, ctx, { percent: watched, extra: nextExtra, complete: reached })
        : await writeUnit(tx, ctx, {
            percent: Math.min(60, Math.round(watched * 0.6)),
            extra: nextExtra,
          })
    return {
      watchedPercent: watched,
      completed: result.unit.status === 'completed',
      completedNow: result.completedNow,
      ...(await finish(tx, learnerId, body.programme)),
    }
  })
}

/** C02 preview: score from the first decision (full marks first time), recorded with choices. */
export function branchingScore(choices: readonly string[]): number {
  const wrong = choices.filter((c) => c !== 'B').length
  return Math.max(40, 100 - wrong * 30)
}

export async function recordBranching(learnerId: string, body: BranchingBody) {
  if (body.choices.at(-1) !== 'B') {
    throw HttpError.badRequest('Finish the first decision before recording the result')
  }
  if (body.confirmChoice !== 'confirm') {
    throw HttpError.badRequest('Confirm the next step with the family to complete the preview')
  }
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, body.programme, 'C02')
    const score = branchingScore(body.choices)
    const extra = extraOf(ctx.unit)
    const attempts = Number(extra.attempts ?? 0) + 1
    const best = Math.max(ctx.unit?.scoreRaw ?? 0, score)
    const result = await writeUnit(tx, ctx, {
      scoreRaw: best,
      cmiCompletionStatus: 'completed',
      extra: {
        ...extra,
        attempts,
        lastChoices: body.choices,
        optionChosen: body.optionChosen,
        confirmChoice: body.confirmChoice,
        lastScore: score,
      },
      complete: true,
    })
    return {
      score,
      bestScore: best,
      completedNow: result.completedNow,
      ...(await finish(tx, learnerId, body.programme)),
    }
  })
}

/** C03 formative check: graded here, so the answers never reach the browser. */
export async function answerFormative(learnerId: string, body: FormativeAnswerBody) {
  const question = C03_QUESTIONS.find((q) => q.id === body.questionId)
  if (!question) throw HttpError.notFound('Question not found')
  const correct = body.option === question.correct
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, body.programme, 'C03')
    const extra = extraOf(ctx.unit)
    const answers = {
      ...((extra.formative ?? {}) as Record<string, { option: string; correct: boolean }>),
    }
    // A correct answer stays correct; a retry can only improve it.
    if (!answers[question.id]?.correct) answers[question.id] = { option: body.option, correct }
    const correctCount = C03_QUESTIONS.filter((q) => answers[q.id]?.correct).length
    const done = correctCount === C03_QUESTIONS.length
    const videoPercent = Number(extra.videoPercent ?? 0)
    const result = await writeUnit(tx, ctx, {
      percent: Math.round(Math.min(60, videoPercent * 0.6) + (correctCount / 3) * 40),
      scoreRaw: Math.round((correctCount / 3) * 100),
      extra: { ...extra, formative: answers },
      complete: done,
    })
    return {
      questionId: question.id,
      correct,
      feedback: correct ? question.feedback.correct : question.feedback.incorrect,
      correctCount,
      completed: result.unit.status === 'completed',
      completedNow: result.completedNow,
      ...(await finish(tx, learnerId, body.programme)),
    }
  })
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/**
 * C05 checklist and plan. Program A completes it here (it develops into the practical
 * assignment). Program B completes it when a trainer approves the short response (brief §5).
 */
export async function saveResource(learnerId: string, body: ResourceBody) {
  const valid = new Set<string>(C05_CHECKLIST.map((item) => item.key))
  const checklist = body.checklist.filter((key) => valid.has(key))
  const draft = body.draft ?? ''
  if (body.markComplete) {
    if (body.programme !== 'A') {
      throw HttpError.badRequest(
        'In Program B this unit completes when your short response is approved',
      )
    }
    if (checklist.length < C05_CHECKLIST.length || wordCount(draft) < C05_MIN_DRAFT_WORDS) {
      throw HttpError.badRequest(
        `Tick every checklist item and write at least ${C05_MIN_DRAFT_WORDS} words in your plan`,
      )
    }
  }
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, body.programme, 'C05')
    const extra = extraOf(ctx.unit)
    const result = await writeUnit(tx, ctx, {
      percent: Math.round((checklist.length / C05_CHECKLIST.length) * 80),
      extra: { ...extra, checklist, draft },
      complete: body.markComplete,
    })
    return {
      completed: result.unit.status === 'completed',
      completedNow: result.completedNow,
      ...(await finish(tx, learnerId, body.programme)),
    }
  })
}

/** C07 (Program C sample): viewing the overview completes it. */
export async function recordPreviewViewed(learnerId: string, programme: ProgrammeCode) {
  return db.transaction(async (tx) => {
    const ctx = await requireUnitContext(tx, learnerId, programme, 'C07')
    const result = await writeUnit(tx, ctx, { complete: true })
    return {
      completed: true as const,
      completedNow: result.completedNow,
      ...(await finish(tx, learnerId, programme)),
    }
  })
}
