import type { Competency, PathItemKind, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES, THRESHOLDS } from '@shared/constants'
import {
  ASSESSMENT_RESULT_COPY,
  ASSESSMENT_VERSION,
  COMPETENCY_LABELS,
} from '@shared/content/assessments'
import { COURSE_BY_CODE } from '@shared/content/curriculum'
import { idParam } from '@shared/schemas/common'
import { assessmentKindParam, assessmentSaveBody } from '@shared/schemas/learning-engine'
import type { AssessmentAttemptRow } from '@shared/types/db'
import { COMPETENCY_COURSE } from './ai-path/logic'
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
} from './api'
import {
  type AssessmentKind,
  BANK,
  pointsFor,
  questionsFor,
  scoreSelections,
} from './assessments/bank'
import { type EnrolmentContext, findEnrolment, loadEvidence } from './progress/evidence'
import { recomputeEnrolment } from './progress/recompute'
import {
  type AttemptEvidence,
  baselineAttempt,
  bestScore,
  evaluate,
  latestPostAttempt,
} from './progress/rules'

/**
 * Baseline, foundation quiz and post / final assessments (brief §5, §6, §8), formerly
 * server/modules/assessments: five items, one per competency, 0 or 20 each, shuffled answers,
 * save and resume, results by competency. Learners take and read their own assessments only;
 * someone else's attempt answers "not found".
 */

export type { AssessmentKind }

const ITEM_KIND: Record<AssessmentKind, PathItemKind> = {
  pre: 'assessment_pre',
  post: 'assessment_post',
  formative: 'assessment_formative',
}

/** Which assessments each programme uses (brief §5–6). Program C has none. */
export const PROGRAMME_KINDS: Record<ProgrammeCode, readonly AssessmentKind[]> = {
  A: ['pre', 'formative', 'post'],
  B: ['pre', 'post'],
  C: [],
}

export function kindTitle(kind: AssessmentKind, programme: ProgrammeCode) {
  if (kind === 'pre') return 'Baseline assessment'
  if (kind === 'formative') return 'Foundation quiz'
  return programme === 'A' ? 'Final assessment' : 'Post-assessment'
}

function passMark(kind: AssessmentKind, programme: ProgrammeCode): number | null {
  if (kind === 'post') return programme === 'A' ? THRESHOLDS.finalAssessmentPass : null
  return kind === 'formative' ? THRESHOLDS.foundationQuizPass : null
}

function assessmentFor(kind: AssessmentKind) {
  const row = db.assessments.find((a) => a.kind === kind && a.version === ASSESSMENT_VERSION)
  if (!row) throw ApiError.notFound('Assessment not found')
  return row
}

function requireEnrolment(learnerId: string, programme: ProgrammeCode) {
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw ApiError.notFound('You are not enrolled in this programme')
  return enrolment
}

function assertKind(programme: ProgrammeCode, kind: AssessmentKind) {
  if (!PROGRAMME_KINDS[programme].includes(kind)) {
    throw ApiError.notFound('This assessment is not part of the programme')
  }
}

/** Lock state from the programme rules, plus whether another attempt is allowed. */
function availability(
  enrolment: EnrolmentContext,
  kind: AssessmentKind,
  attempts: readonly AttemptEvidence[],
  items: ReturnType<typeof evaluate>['items'],
) {
  const item = items.find((i) => i.kind === ITEM_KIND[kind])
  const locked = item?.state === 'locked'
  const submitted = attempts.filter((a) => a.kind === kind && a.status === 'submitted')
  const best = bestScore(attempts, kind)
  const latest = [...submitted].sort((a, b) => b.attemptNo - a.attemptNo)[0]
  const mark = passMark(kind, enrolment.programme)
  let canStart = !locked
  let reason: string | null = locked ? (item?.lockReason ?? 'Not available yet') : null
  if (!locked && submitted.length > 0) {
    if (kind === 'pre') {
      canStart = false
      reason = 'Your baseline is recorded. It is taken once so improvement can be measured.'
    } else if (mark !== null && (best ?? 0) >= mark) {
      canStart = false
      reason = 'You have passed this assessment.'
    } else if (mark === null && (latest?.score ?? 0) >= THRESHOLDS.programmeBReviewSuggested) {
      canStart = false
      reason = 'Your post-assessment is recorded.'
    }
  }
  return {
    locked,
    canStart,
    reason,
    best,
    latest: latest?.score ?? null,
    attempts: submitted.length,
  }
}

function context(learnerId: string, programme: ProgrammeCode) {
  const enrolment = requireEnrolment(learnerId, programme)
  const evidence = loadEvidence(enrolment)
  return { enrolment, evidence, evaluation: evaluate(evidence) }
}

/** The programme's assessments with their availability, and the baseline/post comparison. */
export async function overview(programme: ProgrammeCode) {
  await delay()
  const learnerId = requireRole('learner').id
  const { enrolment, evidence, evaluation } = context(learnerId, programme)
  const baseline = baselineAttempt(evidence.attempts)
  const post = latestPostAttempt(evidence.attempts)
  return out({
    programme,
    programmeTitle: enrolment.programmeTitle,
    version: ASSESSMENT_VERSION,
    items: PROGRAMME_KINDS[programme].map((kind) => ({
      kind,
      title: kindTitle(kind, programme),
      passMark: passMark(kind, programme),
      questions: BANK[kind].length,
      inProgress: evidence.attempts.some((a) => a.kind === kind && a.status === 'in_progress'),
      ...availability(enrolment, kind, evidence.attempts, evaluation.items),
    })),
    comparison:
      baseline && post && baseline.score !== null && post.score !== null
        ? { baseline: baseline.score, post: post.score, gainPoints: post.score - baseline.score }
        : null,
  })
}

const byAttemptNoDesc = (a: AssessmentAttemptRow, b: AssessmentAttemptRow) =>
  b.attemptNo - a.attemptNo

function attemptsOf(enrolmentId: string, assessmentId: string) {
  return db.assessmentAttempts.filter(
    (a) => a.enrolmentId === enrolmentId && a.assessmentId === assessmentId,
  )
}

function inProgressAttempt(enrolmentId: string, assessmentId: string) {
  return (
    attemptsOf(enrolmentId, assessmentId)
      .filter((a) => a.status === 'in_progress')
      .sort(byAttemptNoDesc)[0] ?? null
  )
}

function savedAnswers(attemptId: string): Partial<Record<Competency, string>> {
  return Object.fromEntries(
    db.assessmentAnswers
      .filter((a) => a.attemptId === attemptId)
      .map((a) => [a.competency, a.selectedOption]),
  )
}

function introCopy(kind: AssessmentKind, programme: ProgrammeCode) {
  const name = programme === 'A' ? 'Tourism Service Professional' : 'Visitor Service Essentials'
  if (kind === 'pre') {
    return `Five scenario questions for ${name}. ${ASSESSMENT_RESULT_COPY.baselineIntro}`
  }
  if (kind === 'formative') {
    return `Five questions on the Level 1 foundation units. You need at least ${THRESHOLDS.foundationQuizPass} percent to open Level 2. Targeted review and retry are available.`
  }
  return programme === 'A'
    ? `A parallel version of the baseline that tests the same five competencies with new scenarios. You need at least ${THRESHOLDS.finalAssessmentPass} percent. Targeted review and retry are available.`
    : 'Equivalent questions measuring the same competencies as your baseline, so you can see your improvement.'
}

/** The runner's state: the open attempt with saved answers (resume), or the last result. */
export async function getState(programme: ProgrammeCode, kind: AssessmentKind) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(assessmentKindParam, { programme, kind }, 'param')
  assertKind(programme, kind)
  const { enrolment, evidence, evaluation } = context(learnerId, programme)
  const assessment = assessmentFor(kind)
  const open = inProgressAttempt(enrolment.id, assessment.id)
  const lastSubmitted = attemptsOf(enrolment.id, assessment.id)
    .filter((a) => a.status === 'submitted')
    .sort(byAttemptNoDesc)[0]
  return out({
    kind,
    programme,
    title: kindTitle(kind, programme),
    version: assessment.version,
    passMark: passMark(kind, programme),
    intro: introCopy(kind, programme),
    availability: availability(enrolment, kind, evidence.attempts, evaluation.items),
    attempt: open
      ? {
          id: open.id,
          attemptNo: open.attemptNo,
          questions: questionsFor(kind, open.id),
          answers: savedAnswers(open.id),
        }
      : null,
    lastResult: lastSubmitted ? resultView(learnerId, lastSubmitted.id) : null,
  })
}

/** Starts an attempt, or returns the one already open (save and resume). */
export async function start(programme: ProgrammeCode, kind: AssessmentKind) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(assessmentKindParam, { programme, kind }, 'param')
  assertKind(programme, kind)
  const enrolment = requireEnrolment(learnerId, programme)
  const assessment = assessmentFor(kind)
  const open = inProgressAttempt(enrolment.id, assessment.id)
  if (open) return out({ attemptId: open.id, resumed: true })

  const evidence = loadEvidence(enrolment)
  const avail = availability(enrolment, kind, evidence.attempts, evaluate(evidence).items)
  if (!avail.canStart) throw ApiError.badRequest(avail.reason ?? 'Not available yet')

  const last = Math.max(0, ...attemptsOf(enrolment.id, assessment.id).map((a) => a.attemptNo))
  const instant = nowIso()
  const row = insertRow('assessmentAttempts', {
    assessmentId: assessment.id,
    enrolmentId: enrolment.id,
    learnerId,
    attemptNo: last + 1,
    status: 'in_progress',
    score: null,
    competencyScores: null,
    startedAt: instant,
    submittedAt: null,
  })
  touchEnrolment(enrolment.id, instant)
  recomputeEnrolment(learnerId, programme)
  commit()
  return out({ attemptId: row.id, resumed: false })
}

function touchEnrolment(enrolmentId: string, instant: string) {
  const row = db.enrolments.find((e) => e.id === enrolmentId)
  if (row) updateRow(row, { lastActivityAt: instant })
}

/** The attempt, if it belongs to this learner. Someone else's attempt is "not found". */
function ownedAttempt(learnerId: string, attemptId: string) {
  const row = db.assessmentAttempts.find((a) => a.id === attemptId)
  const assessment = row ? db.assessments.find((a) => a.id === row.assessmentId) : undefined
  if (!row || !assessment || row.learnerId !== learnerId) {
    throw ApiError.notFound('Attempt not found')
  }
  return { row, kind: assessment.kind }
}

/** Saves one answer as the learner goes (brief §5: save/resume). */
export async function saveAnswer(input: {
  attemptId: string
  competency: Competency
  option: 'A' | 'B' | 'C'
}) {
  await delay()
  const learnerId = requireRole('learner').id
  const { id: attemptId } = parseInput(idParam, { id: input.attemptId }, 'param')
  const { competency, option } = parseInput(assessmentSaveBody, {
    competency: input.competency,
    option: input.option,
  })
  const attempt = ownedAttempt(learnerId, attemptId)
  if (attempt.row.status !== 'in_progress') {
    throw ApiError.badRequest('This attempt is already submitted')
  }
  const points = pointsFor(attempt.kind, competency, option)
  const existing = db.assessmentAnswers.find(
    (a) => a.attemptId === attemptId && a.competency === competency,
  )
  if (existing) updateRow(existing, { selectedOption: option, points })
  else insertRow('assessmentAnswers', { attemptId, competency, selectedOption: option, points })
  commit()
  return out({ saved: true as const, answered: Object.keys(savedAnswers(attemptId)).length })
}

/** Scores and closes the attempt, recomputes the enrolment, and returns the result. */
export async function submit(attemptId: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(idParam, { id: attemptId }, 'param')
  const attempt = ownedAttempt(learnerId, attemptId)
  if (attempt.row.status !== 'in_progress') {
    throw ApiError.badRequest('This attempt is already submitted')
  }
  const answers = savedAnswers(attemptId)
  const missing = COMPETENCIES.filter((c) => !answers[c])
  if (missing.length > 0) {
    throw ApiError.badRequest('Answer every question before submitting', { missing })
  }
  const { total, byCompetency } = scoreSelections(attempt.kind, answers)
  const instant = nowIso()
  updateRow(attempt.row, {
    status: 'submitted',
    score: total,
    competencyScores: byCompetency,
    submittedAt: instant,
  })
  touchEnrolment(attempt.row.enrolmentId, instant)
  recomputeEnrolment(learnerId, programmeOfEnrolment(attempt.row.enrolmentId))
  commit()
  return out(resultView(learnerId, attemptId))
}

/** A submitted attempt's result (owner only). */
export async function getResult(attemptId: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(idParam, { id: attemptId }, 'param')
  return out(resultView(learnerId, attemptId))
}

function programmeOfEnrolment(enrolmentId: string): ProgrammeCode {
  const enrolment = db.enrolments.find((e) => e.id === enrolmentId)
  const programme = enrolment
    ? db.programmes.find((p) => p.id === enrolment.programmeId)
    : undefined
  if (!programme) throw ApiError.notFound('Enrolment not found')
  return programme.code
}

/**
 * Result by competency. A baseline explains the result without coaching the exact post answers
 * (brief §8); the foundation quiz and final assessment add targeted review for missed areas.
 */
function resultView(learnerId: string, attemptId: string) {
  const row = db.assessmentAttempts.find((a) => a.id === attemptId)
  const assessment = row ? db.assessments.find((a) => a.id === row.assessmentId) : undefined
  if (!row || !assessment || row.learnerId !== learnerId || row.status !== 'submitted') {
    throw ApiError.notFound('Result not found')
  }
  const kind = assessment.kind
  const programme = programmeOfEnrolment(row.enrolmentId)
  const scores = row.competencyScores ?? {}
  const mark = passMark(kind, programme)

  // Matched comparison: the baseline of the same enrolment against this post attempt.
  let comparison: { baseline: number; post: number; gainPoints: number } | null = null
  if (kind === 'post') {
    const preIds = new Set(db.assessments.filter((a) => a.kind === 'pre').map((a) => a.id))
    const pre = db.assessmentAttempts
      .filter(
        (a) =>
          a.enrolmentId === row.enrolmentId &&
          preIds.has(a.assessmentId) &&
          a.status === 'submitted',
      )
      .sort((a, b) => a.attemptNo - b.attemptNo)[0]
    if (pre?.score != null && row.score != null) {
      comparison = { baseline: pre.score, post: row.score, gainPoints: row.score - pre.score }
    }
  }

  return {
    attemptId: row.id,
    kind,
    title: kindTitle(kind, programme),
    version: assessment.version,
    attemptNo: row.attemptNo,
    score: row.score ?? 0,
    passMark: mark,
    passed: mark === null ? null : (row.score ?? 0) >= mark,
    reviewSuggested:
      programme === 'B' &&
      kind === 'post' &&
      (row.score ?? 0) < THRESHOLDS.programmeBReviewSuggested,
    submittedAt: row.submittedAt,
    competencies: COMPETENCIES.map((c) => {
      const points = scores[c] ?? 0
      const course = COMPETENCY_COURSE[c]
      return {
        key: c,
        label: COMPETENCY_LABELS[c],
        points,
        strong: points > 0,
        review:
          points > 0 || kind === 'pre'
            ? null
            : { courseCode: course, courseTitle: COURSE_BY_CODE[course]?.title ?? course },
      }
    }),
    note:
      kind === 'pre'
        ? 'Your baseline identifies useful learning. It is not an entry barrier, and it does not reveal the answers to the post-assessment.'
        : null,
    comparison,
  }
}
