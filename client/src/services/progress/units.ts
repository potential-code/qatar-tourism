import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import { COURSE_BY_CODE } from '@shared/content/curriculum'
import {
  type BranchingBody,
  branchingBody,
  type FormativeAnswerBody,
  formativeAnswerBody,
  previewViewedBody,
  type ResourceBody,
  resourceBody,
  type VideoProgressBody,
  videoProgressBody,
} from '@shared/schemas/learning-engine'
import type { UnitProgressRow } from '@shared/types/db'
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
  updateRow,
} from '../api'
import { C03_QUESTIONS, C05_CHECKLIST, C05_MIN_DRAFT_WORDS } from '../courses/unit-content'
import { type EnrolmentContext, findEnrolment, findEnrolmentRow } from './evidence'
import { recomputeEnrolment } from './recompute'

/**
 * Learner unit events (brief §7): video watched, branching preview, formative check, resource
 * and preview. Each one writes the unit, touches the enrolment's last activity, then recomputes
 * the enrolment. A unit's `completedAt` is written once. The learner is always the signed-in
 * user, never an id from the caller.
 */

type UnitContext = { enrolment: EnrolmentContext; courseId: string; unit: UnitProgressRow | null }

/** The learner's enrolment, and a check that the course belongs to that programme. */
export function requireUnitContext(
  learnerId: string,
  programme: ProgrammeCode,
  courseCode: string,
): UnitContext {
  const course = COURSE_BY_CODE[courseCode]
  if (!course?.programmes.includes(programme)) {
    throw ApiError.notFound('This unit is not part of the programme')
  }
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw ApiError.notFound('You are not enrolled in this programme')
  const courseRow = db.courses.find((c) => c.code === courseCode)
  if (!courseRow) throw ApiError.notFound('Unit not found')
  const unit =
    db.unitProgress.find((u) => u.enrolmentId === enrolment.id && u.courseId === courseRow.id) ??
    null
  return { enrolment, courseId: courseRow.id, unit }
}

type UnitPatch = Partial<
  Pick<
    UnitProgressRow,
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
 * sets `completedAt`: a second pass never counts twice. A completed unit is never reopened.
 * Returns whether this call was the one that completed the unit. The caller commits.
 */
export function writeUnit(
  ctx: UnitContext,
  patch: UnitPatch,
): { completedNow: boolean; unit: UnitProgressRow } {
  const instant = nowIso()
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
  const unit = ctx.unit
    ? updateRow(ctx.unit, values)
    : insertRow('unitProgress', {
        enrolmentId: ctx.enrolment.id,
        courseId: ctx.courseId,
        ...values,
      })
  const enrolment = findEnrolmentRow(ctx.enrolment.learnerId, ctx.enrolment.programme)?.row
  if (enrolment) updateRow(enrolment, { lastActivityAt: instant })
  return { completedNow: completeNow, unit }
}

/** Recomputes the enrolment and saves: the end of every unit event. */
function finish(learnerId: string, programme: ProgrammeCode) {
  const status = recomputeEnrolment(learnerId, programme)
  commit()
  return { enrolmentStatus: status }
}

const extraOf = (unit: UnitProgressRow | null) => unit?.extra ?? {}

const learner = () => requireRole('learner').id

// ---------------------------------------------------------------------------------------------

/** C01: complete at 90 percent watched. C03: the video is tracked; its questions complete it. */
export async function recordVideo(input: VideoProgressBody) {
  await delay()
  const learnerId = learner()
  const body = parseInput(videoProgressBody, input)
  const ctx = requireUnitContext(learnerId, body.programme, body.courseCode)
  const extra = extraOf(ctx.unit)
  const watched = Math.max(Number(extra.videoPercent ?? 0), Math.round(body.watchedPercent))
  const reached = watched >= THRESHOLDS.videoCompletePercent
  const nextExtra = { ...extra, videoPercent: watched, positionSeconds: body.positionSeconds ?? 0 }
  const result =
    body.courseCode === 'C01'
      ? writeUnit(ctx, { percent: watched, extra: nextExtra, complete: reached })
      : writeUnit(ctx, { percent: Math.min(60, Math.round(watched * 0.6)), extra: nextExtra })
  return out({
    watchedPercent: watched,
    completed: result.unit.status === 'completed',
    completedNow: result.completedNow,
    ...finish(learnerId, body.programme),
  })
}

/** C02 preview: score from the first decision (full marks first time), recorded with choices. */
export function branchingScore(choices: readonly string[]): number {
  const wrong = choices.filter((c) => c !== 'B').length
  return Math.max(40, 100 - wrong * 30)
}

export async function recordBranching(input: BranchingBody) {
  await delay()
  const learnerId = learner()
  const body = parseInput(branchingBody, input)
  if (body.choices.at(-1) !== 'B') {
    throw ApiError.badRequest('Finish the first decision before recording the result')
  }
  if (body.confirmChoice !== 'confirm') {
    throw ApiError.badRequest('Confirm the next step with the family to complete the preview')
  }
  const ctx = requireUnitContext(learnerId, body.programme, 'C02')
  const score = branchingScore(body.choices)
  const extra = extraOf(ctx.unit)
  const attempts = Number(extra.attempts ?? 0) + 1
  const best = Math.max(ctx.unit?.scoreRaw ?? 0, score)
  const result = writeUnit(ctx, {
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
  return out({
    score,
    bestScore: best,
    completedNow: result.completedNow,
    ...finish(learnerId, body.programme),
  })
}

/** C03 formative check: graded here, so the answers never reach the UI. */
export async function answerFormative(input: FormativeAnswerBody) {
  await delay()
  const learnerId = learner()
  const body = parseInput(formativeAnswerBody, input)
  const question = C03_QUESTIONS.find((q) => q.id === body.questionId)
  if (!question) throw ApiError.notFound('Question not found')
  const correct = body.option === question.correct
  const ctx = requireUnitContext(learnerId, body.programme, 'C03')
  const extra = extraOf(ctx.unit)
  const answers = {
    ...((extra.formative ?? {}) as Record<string, { option: string; correct: boolean }>),
  }
  // A correct answer stays correct; a retry can only improve it.
  if (!answers[question.id]?.correct) answers[question.id] = { option: body.option, correct }
  const correctCount = C03_QUESTIONS.filter((q) => answers[q.id]?.correct).length
  const done = correctCount === C03_QUESTIONS.length
  const videoPercent = Number(extra.videoPercent ?? 0)
  const result = writeUnit(ctx, {
    percent: Math.round(Math.min(60, videoPercent * 0.6) + (correctCount / 3) * 40),
    scoreRaw: Math.round((correctCount / 3) * 100),
    extra: { ...extra, formative: answers },
    complete: done,
  })
  return out({
    questionId: question.id,
    correct,
    feedback: correct ? question.feedback.correct : question.feedback.incorrect,
    correctCount,
    completed: result.unit.status === 'completed',
    completedNow: result.completedNow,
    ...finish(learnerId, body.programme),
  })
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/**
 * C05 checklist and plan. Program A completes it here (it develops into the practical
 * assignment). Program B completes it when a trainer approves the short response (brief §5).
 */
export async function saveResource(input: ResourceBody) {
  await delay()
  const learnerId = learner()
  const body = parseInput(resourceBody, input)
  const valid = new Set<string>(C05_CHECKLIST.map((item) => item.key))
  const checklist = body.checklist.filter((key) => valid.has(key))
  const draft = body.draft ?? ''
  if (body.markComplete) {
    if (body.programme !== 'A') {
      throw ApiError.badRequest(
        'In Program B this unit completes when your short response is approved',
      )
    }
    if (checklist.length < C05_CHECKLIST.length || wordCount(draft) < C05_MIN_DRAFT_WORDS) {
      throw ApiError.badRequest(
        `Tick every checklist item and write at least ${C05_MIN_DRAFT_WORDS} words in your plan`,
      )
    }
  }
  const ctx = requireUnitContext(learnerId, body.programme, 'C05')
  const extra = extraOf(ctx.unit)
  const result = writeUnit(ctx, {
    percent: Math.round((checklist.length / C05_CHECKLIST.length) * 80),
    extra: { ...extra, checklist, draft },
    complete: body.markComplete,
  })
  return out({
    completed: result.unit.status === 'completed',
    completedNow: result.completedNow,
    ...finish(learnerId, body.programme),
  })
}

/** C07 (Program C sample): viewing the overview completes it. */
export async function recordPreviewViewed(programme: ProgrammeCode) {
  await delay()
  const learnerId = learner()
  const body = parseInput(previewViewedBody, { programme })
  const ctx = requireUnitContext(learnerId, body.programme, 'C07')
  const result = writeUnit(ctx, { complete: true })
  return out({
    completed: true as const,
    completedNow: result.completedNow,
    ...finish(learnerId, body.programme),
  })
}
