import { db } from '@server/db/connection'
import {
  assessmentAnswers,
  assessmentAttempts,
  assessments,
  enrolments,
  programmes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { COMPETENCY_COURSE } from '@server/modules/ai-path/ai-path.logic'
import {
  type EnrolmentContext,
  findEnrolment,
  loadEvidence,
  type Reader,
} from '@server/modules/progress/progress.evidence'
import {
  type AttemptEvidence,
  baselineAttempt,
  bestScore,
  evaluate,
  latestPostAttempt,
} from '@server/modules/progress/progress.rules'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import type { Competency, PathItemKind, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES, THRESHOLDS } from '@shared/constants'
import {
  ASSESSMENT_RESULT_COPY,
  ASSESSMENT_VERSION,
  COMPETENCY_LABELS,
} from '@shared/content/assessments'
import { COURSE_BY_CODE } from '@shared/content/curriculum'
import { and, asc, desc, eq, max } from 'drizzle-orm'
import {
  type AssessmentKind,
  BANK,
  pointsFor,
  questionsFor,
  scoreSelections,
} from './assessments.bank'

/**
 * Baseline, foundation quiz and post / final assessments (brief §5, §6, §8): five items, one per
 * competency, 0 or 20 each, shuffled answers, save and resume, results by competency.
 */

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

const PASS_MARK: Record<AssessmentKind, number | null> = {
  pre: null,
  formative: THRESHOLDS.foundationQuizPass,
  post: null,
}

function passMark(kind: AssessmentKind, programme: ProgrammeCode) {
  if (kind === 'post') return programme === 'A' ? THRESHOLDS.finalAssessmentPass : null
  return PASS_MARK[kind]
}

async function assessmentId(reader: Reader, kind: AssessmentKind) {
  const [row] = await reader
    .select({ id: assessments.id, version: assessments.version })
    .from(assessments)
    .where(and(eq(assessments.kind, kind), eq(assessments.version, ASSESSMENT_VERSION)))
    .limit(1)
  if (!row) throw HttpError.notFound('Assessment not found')
  return row
}

async function requireEnrolment(reader: Reader, learnerId: string, programme: ProgrammeCode) {
  const enrolment = await findEnrolment(reader, learnerId, programme)
  if (!enrolment) throw HttpError.notFound('You are not enrolled in this programme')
  return enrolment
}

function assertKind(programme: ProgrammeCode, kind: AssessmentKind) {
  if (!PROGRAMME_KINDS[programme].includes(kind)) {
    throw HttpError.notFound('This assessment is not part of the programme')
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

async function context(learnerId: string, programme: ProgrammeCode) {
  const enrolment = await requireEnrolment(db, learnerId, programme)
  const evidence = await loadEvidence(db, enrolment)
  return { enrolment, evidence, evaluation: evaluate(evidence) }
}

export async function overview(learnerId: string, programme: ProgrammeCode) {
  const { enrolment, evidence, evaluation } = await context(learnerId, programme)
  const baseline = baselineAttempt(evidence.attempts)
  const post = latestPostAttempt(evidence.attempts)
  return {
    programme,
    programmeTitle: enrolment.programmeTitle,
    version: ASSESSMENT_VERSION,
    items: PROGRAMME_KINDS[programme].map((kind) => {
      const avail = availability(enrolment, kind, evidence.attempts, evaluation.items)
      const inProgress = evidence.attempts.some(
        (a) => a.kind === kind && a.status === 'in_progress',
      )
      return {
        kind,
        title: kindTitle(kind, programme),
        passMark: passMark(kind, programme),
        questions: BANK[kind].length,
        inProgress,
        ...avail,
      }
    }),
    comparison:
      baseline && post && baseline.score !== null && post.score !== null
        ? { baseline: baseline.score, post: post.score, gainPoints: post.score - baseline.score }
        : null,
  }
}

async function inProgressAttempt(reader: Reader, enrolmentId: string, assessment: string) {
  const [row] = await reader
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, enrolmentId),
        eq(assessmentAttempts.assessmentId, assessment),
        eq(assessmentAttempts.status, 'in_progress'),
      ),
    )
    .orderBy(desc(assessmentAttempts.attemptNo))
    .limit(1)
  return row ?? null
}

async function savedAnswers(reader: Reader, attemptId: string) {
  const rows = await reader
    .select({ competency: assessmentAnswers.competency, option: assessmentAnswers.selectedOption })
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.attemptId, attemptId))
  return Object.fromEntries(rows.map((r) => [r.competency, r.option])) as Partial<
    Record<Competency, string>
  >
}

/** The runner's state: the open attempt with saved answers (resume), or the last result. */
export async function getState(learnerId: string, programme: ProgrammeCode, kind: AssessmentKind) {
  assertKind(programme, kind)
  const { enrolment, evidence, evaluation } = await context(learnerId, programme)
  const assessment = await assessmentId(db, kind)
  const open = await inProgressAttempt(db, enrolment.id, assessment.id)
  const [lastSubmitted] = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.enrolmentId, enrolment.id),
        eq(assessmentAttempts.assessmentId, assessment.id),
        eq(assessmentAttempts.status, 'submitted'),
      ),
    )
    .orderBy(desc(assessmentAttempts.attemptNo))
    .limit(1)
  return {
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
          answers: await savedAnswers(db, open.id),
        }
      : null,
    lastResult: lastSubmitted ? await resultFor(learnerId, lastSubmitted.id) : null,
  }
}

function introCopy(kind: AssessmentKind, programme: ProgrammeCode) {
  const context = programme === 'A' ? 'Tourism Service Professional' : 'Visitor Service Essentials'
  if (kind === 'pre') {
    return `Five scenario questions for ${context}. ${ASSESSMENT_RESULT_COPY.baselineIntro}`
  }
  if (kind === 'formative') {
    return `Five questions on the Level 1 foundation units. You need at least ${THRESHOLDS.foundationQuizPass} percent to open Level 2. Targeted review and retry are available.`
  }
  return programme === 'A'
    ? `A parallel version of the baseline that tests the same five competencies with new scenarios. You need at least ${THRESHOLDS.finalAssessmentPass} percent. Targeted review and retry are available.`
    : 'Equivalent questions measuring the same competencies as your baseline, so you can see your improvement.'
}

/** Starts an attempt, or returns the one already open (save and resume). */
export async function start(learnerId: string, programme: ProgrammeCode, kind: AssessmentKind) {
  assertKind(programme, kind)
  return db.transaction(async (tx) => {
    const enrolment = await requireEnrolment(tx, learnerId, programme)
    const assessment = await assessmentId(tx, kind)
    const open = await inProgressAttempt(tx, enrolment.id, assessment.id)
    if (open) return { attemptId: open.id, resumed: true }

    const evidence = await loadEvidence(tx, enrolment)
    const avail = availability(enrolment, kind, evidence.attempts, evaluate(evidence).items)
    if (!avail.canStart) throw HttpError.badRequest(avail.reason ?? 'Not available yet')

    const [last] = await tx
      .select({ n: max(assessmentAttempts.attemptNo) })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.enrolmentId, enrolment.id),
          eq(assessmentAttempts.assessmentId, assessment.id),
        ),
      )
    const instant = now()
    const [row] = await tx
      .insert(assessmentAttempts)
      .values({
        assessmentId: assessment.id,
        enrolmentId: enrolment.id,
        learnerId,
        attemptNo: (last?.n ?? 0) + 1,
        status: 'in_progress',
        startedAt: instant,
      })
      .returning({ id: assessmentAttempts.id })
    await tx
      .update(enrolments)
      .set({ lastActivityAt: instant })
      .where(eq(enrolments.id, enrolment.id))
    await recomputeEnrolment(learnerId, programme, tx)
    return { attemptId: (row as { id: string }).id, resumed: false }
  })
}

/** The attempt, if it belongs to this learner. Someone else's attempt is "not found". */
async function ownedAttempt(reader: Reader, learnerId: string, attemptId: string) {
  const [row] = await reader
    .select({
      id: assessmentAttempts.id,
      learnerId: assessmentAttempts.learnerId,
      status: assessmentAttempts.status,
      kind: assessments.kind,
      enrolmentId: assessmentAttempts.enrolmentId,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1)
  if (!row || row.learnerId !== learnerId) throw HttpError.notFound('Attempt not found')
  return row
}

/** Saves one answer as the learner goes (brief §5: save/resume). */
export async function saveAnswer(
  learnerId: string,
  attemptId: string,
  competency: Competency,
  option: 'A' | 'B' | 'C',
) {
  const attempt = await ownedAttempt(db, learnerId, attemptId)
  if (attempt.status !== 'in_progress')
    throw HttpError.badRequest('This attempt is already submitted')
  const points = pointsFor(attempt.kind, competency, option)
  const instant = now()
  await db
    .insert(assessmentAnswers)
    .values({ attemptId, competency, selectedOption: option, points })
    .onConflictDoUpdate({
      target: [assessmentAnswers.attemptId, assessmentAnswers.competency],
      set: { selectedOption: option, points, updatedAt: instant },
    })
  const answers = await savedAnswers(db, attemptId)
  return { saved: true as const, answered: Object.keys(answers).length }
}

export async function submit(learnerId: string, attemptId: string) {
  return db.transaction(async (tx) => {
    const attempt = await ownedAttempt(tx, learnerId, attemptId)
    if (attempt.status !== 'in_progress')
      throw HttpError.badRequest('This attempt is already submitted')
    const answers = await savedAnswers(tx, attemptId)
    const missing = COMPETENCIES.filter((c) => !answers[c])
    if (missing.length > 0) {
      throw HttpError.badRequest('Answer every question before submitting', { missing })
    }
    const { total, byCompetency } = scoreSelections(attempt.kind, answers)
    const instant = now()
    await tx
      .update(assessmentAttempts)
      .set({
        status: 'submitted',
        score: total,
        competencyScores: byCompetency,
        submittedAt: instant,
      })
      .where(eq(assessmentAttempts.id, attemptId))
    await tx
      .update(enrolments)
      .set({ lastActivityAt: instant })
      .where(eq(enrolments.id, attempt.enrolmentId))
    const programme = await programmeOfEnrolment(tx, attempt.enrolmentId)
    await recomputeEnrolment(learnerId, programme, tx)
    return resultFor(learnerId, attemptId, tx)
  })
}

async function programmeOfEnrolment(reader: Reader, enrolmentId: string): Promise<ProgrammeCode> {
  const [row] = await reader
    .select({ code: programmes.code })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(eq(enrolments.id, enrolmentId))
    .limit(1)
  if (!row) throw HttpError.notFound('Enrolment not found')
  return row.code
}

/**
 * Result by competency. A baseline explains the result without coaching the exact post answers
 * (brief §8); the foundation quiz and final assessment add targeted review for missed areas.
 */
export async function resultFor(learnerId: string, attemptId: string, reader: Reader = db) {
  const [row] = await reader
    .select({
      id: assessmentAttempts.id,
      learnerId: assessmentAttempts.learnerId,
      kind: assessments.kind,
      version: assessments.version,
      attemptNo: assessmentAttempts.attemptNo,
      status: assessmentAttempts.status,
      score: assessmentAttempts.score,
      competencyScores: assessmentAttempts.competencyScores,
      submittedAt: assessmentAttempts.submittedAt,
      enrolmentId: assessmentAttempts.enrolmentId,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .where(eq(assessmentAttempts.id, attemptId))
    .limit(1)
  if (!row || row.learnerId !== learnerId || row.status !== 'submitted') {
    throw HttpError.notFound('Result not found')
  }
  const programme = await programmeOfEnrolment(reader, row.enrolmentId)
  const scores = (row.competencyScores ?? {}) as Record<string, number>
  const mark = passMark(row.kind, programme)

  // Matched comparison: the baseline of the same enrolment against this post attempt.
  let comparison: { baseline: number; post: number; gainPoints: number } | null = null
  if (row.kind === 'post') {
    const [pre] = await reader
      .select({ score: assessmentAttempts.score })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
      .where(
        and(
          eq(assessmentAttempts.enrolmentId, row.enrolmentId),
          eq(assessments.kind, 'pre'),
          eq(assessmentAttempts.status, 'submitted'),
        ),
      )
      .orderBy(asc(assessmentAttempts.attemptNo))
      .limit(1)
    if (pre?.score != null && row.score != null) {
      comparison = { baseline: pre.score, post: row.score, gainPoints: row.score - pre.score }
    }
  }

  return {
    attemptId: row.id,
    kind: row.kind,
    title: kindTitle(row.kind, programme),
    version: row.version,
    attemptNo: row.attemptNo,
    score: row.score ?? 0,
    passMark: mark,
    passed: mark === null ? null : (row.score ?? 0) >= mark,
    reviewSuggested:
      programme === 'B' &&
      row.kind === 'post' &&
      (row.score ?? 0) < THRESHOLDS.programmeBReviewSuggested,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    competencies: COMPETENCIES.map((c) => {
      const points = scores[c] ?? 0
      const course = COMPETENCY_COURSE[c]
      return {
        key: c,
        label: COMPETENCY_LABELS[c],
        points,
        strong: points > 0,
        review:
          points > 0 || row.kind === 'pre'
            ? null
            : { courseCode: course, courseTitle: COURSE_BY_CODE[course]?.title ?? course },
      }
    }),
    note:
      row.kind === 'pre'
        ? 'Your baseline identifies useful learning. It is not an entry barrier, and it does not reveal the answers to the post-assessment.'
        : null,
    comparison,
  }
}
