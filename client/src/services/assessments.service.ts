import type {
  Competency,
  ContentLanguage,
  PathItemKind,
  ProgrammeCode,
  QuestionType,
} from '@shared/constants'
import { COMPETENCIES, CONTENT_LANGUAGES, THRESHOLDS } from '@shared/constants'
import { ASSESSMENT_VERSION, COMPETENCY_LABELS } from '@shared/content/assessments'
import { COURSE_BY_CODE } from '@shared/content/curriculum'
import { idParam } from '@shared/schemas/common'
import { assessmentKindParam, assessmentSaveBody } from '@shared/schemas/learning-engine'
import type { AssessmentAttemptRow, AssessmentRuleRow } from '@shared/types/db'
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
  closeAttempt,
  isEngineAttempt,
  type LearnerQuestion,
  programmeOfEnrolment,
  reportAttemptToCrm,
  savedSelections,
  secondsLeft,
  settleIfExpired,
  snapshotQuestions,
  toLearnerQuestion,
  touchEnrolment,
  wasAutoSubmitted,
} from './assessments/attempts'
import {
  type AssessmentKind,
  BANK,
  pointsFor,
  questionsFor,
  scoreSelections,
} from './assessments/bank'
import {
  DEFAULT_LANGUAGE,
  drawItems,
  optionOrderFor,
  pickVariant,
  sameSet,
  scoreItems,
} from './assessments/draw'
import { activeRule, allowance, countedScore, ruleById } from './assessments/rules'
import { type EnrolmentContext, findEnrolment, loadEvidence } from './progress/evidence'
import { recomputeEnrolment } from './progress/recompute'
import { baselineAttempt, evaluate } from './progress/rules'

/**
 * Baseline, foundation quiz and post / final assessments (brief §5, §6, §8; SPEC §6).
 * The Pre and Post are driven by published rules: questions are drawn from the bank (in the
 * learner's language), frozen in an attempt snapshot, time limited and counted against an
 * attempt limit. The Program A foundation quiz keeps its fixed five questions. Learners take and
 * read their own assessments only; someone else's attempt answers "not found".
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

/** Why a learner cannot start, as a code the screens translate. */
export type ReasonCode = 'locked' | 'baseline_recorded' | 'passed' | 'limit_reached' | 'no_rule'

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

const ruleFor = (programme: ProgrammeCode, kind: AssessmentKind): AssessmentRuleRow | null =>
  kind === 'formative' || programme === 'C' ? null : activeRule(programme, kind)

function passMark(kind: AssessmentKind, programme: ProgrammeCode): number | null {
  if (kind === 'formative') return THRESHOLDS.foundationQuizPass
  return ruleFor(programme, kind)?.passPercent ?? null
}

const byAttemptNoDesc = (a: AssessmentAttemptRow, b: AssessmentAttemptRow) =>
  b.attemptNo - a.attemptNo

function attemptsOf(enrolmentId: string, assessmentId: string) {
  return db.assessmentAttempts.filter(
    (a) => a.enrolmentId === enrolmentId && a.assessmentId === assessmentId,
  )
}

/** Closes any of this enrolment's open attempts whose time ran out. */
function settleEnrolment(enrolmentId: string) {
  let changed = false
  for (const row of db.assessmentAttempts) {
    if (row.enrolmentId === enrolmentId && settleIfExpired(row)) changed = true
  }
  if (changed) commit()
}

type Availability = {
  locked: boolean
  canStart: boolean
  reason: string | null
  reasonCode: ReasonCode | null
  /** The score that counts under the score policy. */
  best: number | null
  latest: number | null
  /** Submitted attempts. */
  attempts: number
  attemptLimit: number | null
  attemptsRemaining: number | null
  extraGranted: number
  passMark: number | null
  timeLimitMinutes: number | null
  scorePolicy: 'best' | 'latest' | null
  passed: boolean
}

/** Lock state from the programme rules, plus whether another attempt is allowed. */
function availability(
  enrolment: EnrolmentContext,
  kind: AssessmentKind,
  items: ReturnType<typeof evaluate>['items'],
): Availability {
  const item = items.find((i) => i.kind === ITEM_KIND[kind])
  const locked = item?.state === 'locked'
  const assessment = assessmentFor(kind)
  const rows = attemptsOf(enrolment.id, assessment.id)
  const submitted = rows.filter((a) => a.status === 'submitted')
  const latest = [...submitted].sort(byAttemptNoDesc)[0]
  const lockReason = locked ? (item?.lockReason ?? 'Not available yet') : null

  const rule = ruleFor(enrolment.programme, kind)
  if (kind === 'formative' || !rule) {
    const best = countedScore('best', rows)
    const mark = passMark(kind, enrolment.programme)
    const passed = mark !== null && (best ?? 0) >= mark
    const reasonCode: ReasonCode | null = locked
      ? 'locked'
      : passed
        ? 'passed'
        : kind !== 'formative'
          ? 'no_rule'
          : null
    return {
      locked,
      canStart: !locked && !passed && kind === 'formative',
      reason: locked
        ? lockReason
        : passed
          ? 'You have passed this assessment.'
          : reasonCode === 'no_rule'
            ? 'No assessment rule is published for this programme.'
            : null,
      reasonCode,
      best,
      latest: latest?.score ?? null,
      attempts: submitted.length,
      attemptLimit: null,
      attemptsRemaining: null,
      extraGranted: 0,
      passMark: mark,
      timeLimitMinutes: null,
      scorePolicy: null,
      passed,
    }
  }

  const allow = allowance(rule, enrolment.id, assessment.id)
  const best = countedScore(rule.scorePolicy, rows)
  const passed = rule.passPercent !== null && best !== null && best >= rule.passPercent
  let reasonCode: ReasonCode | null = null
  let reason: string | null = null
  if (locked) {
    reasonCode = 'locked'
    reason = lockReason
  } else if (passed) {
    reasonCode = 'passed'
    reason = 'You have passed this assessment.'
  } else if (allow.remaining === 0) {
    if (kind === 'pre') {
      reasonCode = 'baseline_recorded'
      reason = 'Your baseline is recorded. It is taken once so improvement can be measured.'
    } else {
      reasonCode = 'limit_reached'
      reason = 'Attempt limit reached — request support'
    }
  }
  return {
    locked,
    canStart: reasonCode === null,
    reason,
    reasonCode,
    best,
    latest: latest?.score ?? null,
    attempts: submitted.length,
    attemptLimit: allow.limit,
    attemptsRemaining: allow.remaining,
    extraGranted: allow.granted,
    passMark: rule.passPercent,
    timeLimitMinutes: rule.timeLimitMinutes,
    scorePolicy: rule.scorePolicy,
    passed,
  }
}

function context(learnerId: string, programme: ProgrammeCode) {
  const enrolment = requireEnrolment(learnerId, programme)
  settleEnrolment(enrolment.id)
  const evidence = loadEvidence(enrolment)
  return { enrolment, evidence, evaluation: evaluate(evidence) }
}

const normaliseLanguage = (language: string | undefined): ContentLanguage =>
  (CONTENT_LANGUAGES as readonly string[]).includes(language ?? '')
    ? (language as ContentLanguage)
    : DEFAULT_LANGUAGE

/** The programme's assessments with their availability, and the baseline/post comparison. */
export async function overview(programme: ProgrammeCode) {
  await delay()
  const learnerId = requireRole('learner').id
  const { enrolment, evidence, evaluation } = context(learnerId, programme)
  const baseline = baselineAttempt(evidence.attempts)
  const postRule = ruleFor(programme, 'post')
  const postRows = attemptsOf(enrolment.id, assessmentFor('post').id)
  const post = countedScore(postRule?.scorePolicy ?? 'best', postRows)
  return out({
    programme,
    programmeTitle: enrolment.programmeTitle,
    version: ASSESSMENT_VERSION,
    items: PROGRAMME_KINDS[programme].map((kind) => {
      const avail = availability(enrolment, kind, evaluation.items)
      return {
        kind,
        title: kindTitle(kind, programme),
        questions: ruleFor(programme, kind)?.drawCount ?? BANK[kind].length,
        inProgress: evidence.attempts.some((a) => a.kind === kind && a.status === 'in_progress'),
        ...avail,
      }
    }),
    comparison:
      baseline && post !== null && baseline.score !== null
        ? { baseline: baseline.score, post, gainPoints: post - baseline.score }
        : null,
  })
}

function inProgressAttempt(enrolmentId: string, assessmentId: string) {
  return (
    attemptsOf(enrolmentId, assessmentId)
      .filter((a) => a.status === 'in_progress')
      .sort(byAttemptNoDesc)[0] ?? null
  )
}

/** The open attempt as the runner needs it: questions without the key, saved answers, timer. */
function openAttemptView(row: AssessmentAttemptRow, kind: AssessmentKind) {
  const legacy = !isEngineAttempt(row)
  const questions: LearnerQuestion[] = legacy
    ? questionsFor(kind, row.id).map((q) => ({
        id: q.competency,
        competency: q.competency,
        competencyLabel: q.competencyLabel,
        type: 'single' as QuestionType,
        prompt: q.prompt,
        options: q.options,
        language: DEFAULT_LANGUAGE,
      }))
    : snapshotQuestions(row).map(toLearnerQuestion)
  const answers: Record<string, string[]> = legacy
    ? Object.fromEntries(
        db.assessmentAnswers
          .filter((a) => a.attemptId === row.id)
          .map((a) => [a.competency, [a.selectedOption]]),
      )
    : Object.fromEntries(savedSelections(row.id))
  return {
    id: row.id,
    attemptNo: row.attemptNo,
    /** False for the fixed foundation quiz, whose questions are keyed by competency. */
    engine: !legacy,
    questions,
    answers,
    language: questions[0]?.language ?? DEFAULT_LANGUAGE,
    deadlineAt: row.deadlineAt,
    secondsLeft: secondsLeft(row),
    timeLimitMinutes: ruleById(row.ruleId)?.timeLimitMinutes ?? null,
  }
}

/** The runner's state: the open attempt with saved answers (resume), or the last result. */
export async function getState(programme: ProgrammeCode, kind: AssessmentKind) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(assessmentKindParam, { programme, kind }, 'param')
  assertKind(programme, kind)
  const { enrolment, evaluation } = context(learnerId, programme)
  const assessment = assessmentFor(kind)
  const open = inProgressAttempt(enrolment.id, assessment.id)
  const lastSubmitted = attemptsOf(enrolment.id, assessment.id)
    .filter((a) => a.status === 'submitted')
    .sort(byAttemptNoDesc)[0]
  const avail = availability(enrolment, kind, evaluation.items)
  const rule = ruleFor(programme, kind)
  return out({
    kind,
    programme,
    title: kindTitle(kind, programme),
    version: assessment.version,
    passMark: avail.passMark,
    questionCount: rule?.drawCount ?? BANK[kind].length,
    ruleVersion: rule?.version ?? null,
    foundationPass: THRESHOLDS.foundationQuizPass,
    availability: avail,
    attempt: open ? openAttemptView(open, kind) : null,
    lastResult: lastSubmitted ? resultView(learnerId, lastSubmitted.id) : null,
  })
}

/** Starts an attempt, or returns the one already open (save and resume). */
export async function start(
  programme: ProgrammeCode,
  kind: AssessmentKind,
  language: string = DEFAULT_LANGUAGE,
) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(assessmentKindParam, { programme, kind }, 'param')
  assertKind(programme, kind)
  const enrolment = requireEnrolment(learnerId, programme)
  settleEnrolment(enrolment.id)
  const assessment = assessmentFor(kind)
  const open = inProgressAttempt(enrolment.id, assessment.id)
  if (open) return out({ attemptId: open.id, resumed: true })

  const evidence = loadEvidence(enrolment)
  const avail = availability(enrolment, kind, evaluate(evidence).items)
  if (!avail.canStart) throw ApiError.badRequest(avail.reason ?? 'Not available yet')

  const previous = attemptsOf(enrolment.id, assessment.id)
  const attemptNo = Math.max(0, ...previous.map((a) => a.attemptNo)) + 1
  const instant = nowIso()
  const rule = ruleFor(programme, kind)

  if (!rule || kind === 'formative') {
    const row = insertRow('assessmentAttempts', {
      assessmentId: assessment.id,
      enrolmentId: enrolment.id,
      learnerId,
      attemptNo,
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

  // A fresh draw: the seed includes the attempt number and the start instant, so a retake never
  // reuses an earlier draw. Questions the learner already saw come last, so a retake prefers new ones.
  const seed = `${enrolment.id}:${kind}:${attemptNo}:${instant}`
  const seen = new Set(
    previous.flatMap((a) =>
      (a.snapshot?.items ?? []).flatMap((i) => {
        const shared = db.questionBank.find((q) => q.questionId === i.questionId)?.sharedId
        return shared ? [shared] : []
      }),
    ),
  )
  const drawn = drawItems({
    bank: db.questionBank,
    programme: enrolment.programme as 'A' | 'B',
    draws: rule.draws,
    randomiseQuestions: rule.randomiseQuestions,
    seed,
    avoid: seen,
  })
  const language_ = normaliseLanguage(language)
  const items = drawn.items.flatMap((item) => {
    const variant = pickVariant(item, language_)
    return variant
      ? [
          {
            questionId: variant.questionId,
            version: variant.version,
            optionOrder: optionOrderFor(
              variant,
              `${seed}:${variant.questionId}`,
              rule.randomiseOptions,
            ),
            language: variant.language,
          },
        ]
      : []
  })
  if (items.length === 0)
    throw ApiError.badRequest('No published questions match this assessment rule')

  const allow = allowance(rule, enrolment.id, assessment.id)
  const row = insertRow('assessmentAttempts', {
    assessmentId: assessment.id,
    enrolmentId: enrolment.id,
    learnerId,
    attemptNo,
    status: 'in_progress',
    score: null,
    competencyScores: null,
    startedAt: instant,
    submittedAt: null,
    ruleId: rule.id,
    ruleVersion: rule.version,
    snapshot: { items, seed },
    deadlineAt:
      rule.timeLimitMinutes === null
        ? null
        : new Date(Date.parse(instant) + rule.timeLimitMinutes * 60_000).toISOString(),
  })
  // An attempt beyond the rule limit uses up one granted extra attempt.
  if (allow.used >= allow.limit && allow.unusedGrant) {
    updateRow(allow.unusedGrant, { consumedByAttemptId: row.id })
  }
  touchEnrolment(enrolment.id, instant)
  recomputeEnrolment(learnerId, programme)
  commit()
  return out({ attemptId: row.id, resumed: false })
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

export type SaveAnswerInput = { attemptId: string } & (
  | { questionId: string; selected: string[] }
  | { competency: Competency; option: 'A' | 'B' | 'C' }
)

/** Saves one answer as the learner goes (brief §5: save/resume). */
export async function saveAnswer(input: SaveAnswerInput) {
  await delay()
  const learnerId = requireRole('learner').id
  const { id: attemptId } = parseInput(idParam, { id: input.attemptId }, 'param')
  const attempt = ownedAttempt(learnerId, attemptId)
  if (attempt.row.status === 'in_progress' && settleIfExpired(attempt.row)) {
    commit()
    throw ApiError.badRequest('Time is up. Your saved answers were submitted.')
  }
  if (attempt.row.status !== 'in_progress') {
    throw ApiError.badRequest('This attempt is already submitted')
  }

  if (!('questionId' in input)) {
    const { competency, option } = parseInput(assessmentSaveBody, {
      competency: input.competency,
      option: input.option,
    })
    const points = pointsFor(attempt.kind, competency, option)
    const existing = db.assessmentAnswers.find(
      (a) => a.attemptId === attemptId && a.competency === competency,
    )
    if (existing) updateRow(existing, { selectedOption: option, points })
    else insertRow('assessmentAnswers', { attemptId, competency, selectedOption: option, points })
    commit()
    return out({
      saved: true as const,
      answered: db.assessmentAnswers.filter((a) => a.attemptId === attemptId).length,
    })
  }

  const drawn = snapshotQuestions(attempt.row).find(
    (s) => s.question.questionId === input.questionId,
  )
  if (!drawn) throw ApiError.badRequest('That question is not part of this attempt')
  const { question } = drawn
  const keys = [...new Set(input.selected)]
  const valid = new Set(question.options.map((o) => o.key))
  if (keys.some((k) => !valid.has(k))) throw ApiError.badRequest('Choose one of the listed options')
  if (keys.length === 0) {
    // Clearing every choice of a multiple-choice question leaves it unanswered.
    const index = db.assessmentAnswers.findIndex(
      (a) => a.attemptId === attemptId && a.questionId === question.questionId,
    )
    if (index >= 0) db.assessmentAnswers.splice(index, 1)
    commit()
    return out({ saved: true as const, answered: savedSelections(attemptId).size })
  }
  if (question.type !== 'multiple' && keys.length > 1) {
    throw ApiError.badRequest('Choose one option for this question')
  }
  keys.sort()
  const points = sameSet(keys, question.correct) ? question.points : 0
  const existing = db.assessmentAnswers.find(
    (a) => a.attemptId === attemptId && a.questionId === question.questionId,
  )
  if (existing) updateRow(existing, { selectedOption: keys.join(','), points })
  else {
    insertRow('assessmentAnswers', {
      attemptId,
      competency: question.competency,
      selectedOption: keys.join(','),
      points,
      questionId: question.questionId,
    })
  }
  commit()
  return out({ saved: true as const, answered: savedSelections(attemptId).size })
}

/** Scores and closes the attempt, recomputes the enrolment, and returns the result. */
export async function submit(attemptId: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(idParam, { id: attemptId }, 'param')
  const attempt = ownedAttempt(learnerId, attemptId)
  if (attempt.row.status === 'in_progress' && settleIfExpired(attempt.row)) {
    // The time limit had already ended: the saved answers were submitted at the deadline.
    commit()
    return out(resultView(learnerId, attemptId))
  }
  if (attempt.row.status !== 'in_progress') {
    throw ApiError.badRequest('This attempt is already submitted')
  }
  if (isEngineAttempt(attempt.row)) {
    const answered = savedSelections(attemptId)
    const missing = snapshotQuestions(attempt.row).filter(
      (s) => !answered.has(s.question.questionId),
    )
    if (missing.length > 0) {
      throw ApiError.badRequest('Answer every question before submitting', {
        missing: missing.map((s) => s.question.questionId),
      })
    }
    closeAttempt(attempt.row, nowIso())
  } else {
    const answers = Object.fromEntries(
      db.assessmentAnswers
        .filter((a) => a.attemptId === attemptId)
        .map((a) => [a.competency, a.selectedOption]),
    ) as Partial<Record<Competency, string>>
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
    reportAttemptToCrm(attempt.row)
  }
  commit()
  return out(resultView(learnerId, attemptId))
}

/**
 * Called by the timer when it reaches zero. Closes the attempt with the saved answers if the
 * deadline has passed; otherwise reports how long is left (the screen clock can run a moment ahead).
 */
export async function expire(attemptId: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(idParam, { id: attemptId }, 'param')
  const attempt = ownedAttempt(learnerId, attemptId)
  if (attempt.row.status === 'in_progress' && settleIfExpired(attempt.row)) commit()
  const closed = attempt.row.status === 'submitted'
  return out({
    expired: closed,
    secondsLeft: closed ? 0 : secondsLeft(attempt.row),
    result: closed ? resultView(learnerId, attemptId) : null,
  })
}

/** A submitted attempt's result (owner only). */
export async function getResult(attemptId: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(idParam, { id: attemptId }, 'param')
  return out(resultView(learnerId, attemptId))
}

/**
 * Result by competency. A baseline explains the result without coaching the exact post answers
 * (brief §8); the foundation quiz and final assessment add targeted review for missed areas. For
 * rule-driven attempts the question review follows the rule's feedback release.
 */
function resultView(learnerId: string, attemptId: string) {
  const row = db.assessmentAttempts.find((a) => a.id === attemptId)
  const assessment = row ? db.assessments.find((a) => a.id === row.assessmentId) : undefined
  if (!row || !assessment || row.learnerId !== learnerId || row.status !== 'submitted') {
    throw ApiError.notFound('Result not found')
  }
  const kind = assessment.kind
  const programme = programmeOfEnrolment(row.enrolmentId)
  const engine = isEngineAttempt(row)
  const rule = ruleById(row.ruleId) ?? ruleFor(programme, kind)
  const mark = engine ? (ruleById(row.ruleId)?.passPercent ?? null) : passMark(kind, programme)
  const score = row.score ?? 0
  const passed = mark === null ? null : score >= mark
  const scores = row.competencyScores ?? {}

  const allRows = attemptsOf(row.enrolmentId, row.assessmentId)
  const counted = countedScore(rule?.scorePolicy ?? 'best', allRows)
  const enrolment = requireEnrolment(learnerId, programme)
  const current = availability(enrolment, kind, evaluate(loadEvidence(enrolment)).items)

  // Matched comparison: the baseline of the same enrolment against the counted post score.
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
    if (pre?.score != null && counted != null) {
      comparison = { baseline: pre.score, post: counted, gainPoints: counted - pre.score }
    }
  }

  const questions = engine ? snapshotQuestions(row) : []
  const selections = engine ? savedSelections(row.id) : new Map<string, string[]>()
  const scored = engine
    ? scoreItems(
        questions.map(({ question }) => ({
          question,
          selected: selections.get(question.questionId) ?? [],
        })),
      )
    : null

  const release = rule?.feedbackRelease ?? 'after_submission'
  const feedbackVisible = !engine || release !== 'after_pass' || passed !== false
  const review = feedbackVisible
    ? questions.map((entry) => {
        const selected = selections.get(entry.question.questionId) ?? []
        const text = new Map(entry.question.options.map((o) => [o.key, o.text]))
        return {
          ...toLearnerQuestion(entry),
          selected,
          correct: entry.question.correct,
          isCorrect: selected.length > 0 && sameSet(selected, entry.question.correct),
          answered: selected.length > 0,
          feedback: entry.question.feedback,
          points: entry.question.points,
          selectedText: selected.map((k) => text.get(k) ?? k),
          correctText: entry.question.correct.map((k) => text.get(k) ?? k),
        }
      })
    : []

  const competencies = COMPETENCIES.filter(
    (c) => !engine || (scored?.detail[c].total ?? 0) > 0,
  ).map((c) => {
    const points = scores[c] ?? 0
    const course = COMPETENCY_COURSE[c]
    const detail = scored?.detail[c]
    const strong = points >= 10
    return {
      key: c,
      label: COMPETENCY_LABELS[c],
      points,
      strong,
      correct: detail ? detail.correct : points > 0 ? 1 : 0,
      total: detail ? detail.total : 1,
      review:
        strong || kind === 'pre'
          ? null
          : { courseCode: course, courseTitle: COURSE_BY_CODE[course]?.title ?? course },
    }
  })

  return {
    attemptId: row.id,
    kind,
    title: kindTitle(kind, programme),
    version: assessment.version,
    ruleVersion: row.ruleVersion,
    attemptNo: row.attemptNo,
    score,
    passMark: mark,
    passed,
    /** Programme B's post score is advisory: it never blocks completing the programme. */
    gate:
      mark === null
        ? ('none' as const)
        : programme === 'B' && kind === 'post'
          ? ('advisory' as const)
          : ('required' as const),
    reviewSuggested:
      programme === 'B' && kind === 'post' && score < THRESHOLDS.programmeBReviewSuggested,
    submittedAt: row.submittedAt,
    autoSubmitted: wasAutoSubmitted(row),
    answeredCount: engine ? selections.size : COMPETENCIES.length,
    questionCount: engine ? questions.length : COMPETENCIES.length,
    language: questions[0]?.item.language ?? DEFAULT_LANGUAGE,
    earnedPoints: scored?.earned ?? null,
    possiblePoints: scored?.possible ?? null,
    competencies,
    gaps: kind === 'pre' ? competencies.filter((c) => c.points === 0).map((c) => c.key) : [],
    counted,
    scorePolicy: rule?.scorePolicy ?? ('best' as const),
    attemptsRemaining: current?.attemptsRemaining ?? null,
    /** Attempts allowed in total: the rule limit plus any extra attempts granted. */
    attemptLimit:
      current?.attemptLimit == null ? null : current.attemptLimit + current.extraGranted,
    limitReached: current?.reasonCode === 'limit_reached',
    canRetry: current?.canStart ?? false,
    feedbackHeld: engine && !feedbackVisible,
    review,
    comparison,
  }
}
