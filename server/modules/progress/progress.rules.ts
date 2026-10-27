import type { EnrolmentStatus, PathItemKind, ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'

/**
 * Programme completion rules (brief §5 Program B, §6 Program A), as pure functions over the
 * evidence an enrolment has gathered. `recomputeEnrolment` and every learner read model use
 * these, so the dashboard, the path and the stored status can never disagree.
 */

export type UnitEvidence = {
  status: 'not_started' | 'in_progress' | 'completed'
  percent: number
  scoreRaw: number | null
  completedAt: Date | null
}

export type AttemptEvidence = {
  kind: 'pre' | 'post' | 'formative'
  attemptNo: number
  status: 'in_progress' | 'submitted'
  score: number | null
  competencyScores: Record<string, number> | null
  startedAt: Date
  submittedAt: Date | null
}

export type SubmissionEvidence = {
  version: number
  status: 'submitted' | 'under_review' | 'returned' | 'approved'
  submittedAt: Date
  review: { status: 'returned' | 'approved'; score: number; reviewedAt: Date } | null
}

export type SessionEvidence = {
  /** Attended (or late) a non-cancelled Program A session and has a FINAL score. */
  passed: boolean
  /** Holds an active booking (confirmed RSVP on an upcoming session). */
  booked: boolean
  /** Attended but the trainer has not finalised the score yet. */
  awaitingScore: boolean
  bestFinalScore: number | null
}

export type PathItemInput = {
  id: string
  position: number
  kind: PathItemKind
  courseCode: string | null
  scenarioKey: string | null
  title: string
  required: boolean
  level: number
  stage: string
  durationMinutes: number | null
}

export type Evidence = {
  programme: ProgrammeCode
  items: readonly PathItemInput[]
  units: ReadonlyMap<string, UnitEvidence>
  attempts: readonly AttemptEvidence[]
  rolePlayCount: number
  session: SessionEvidence
  submissions: readonly SubmissionEvidence[]
}

export type ItemState = 'locked' | 'available' | 'in_progress' | 'completed'

export type EvaluatedItem = PathItemInput & {
  state: ItemState
  lockReason: string | null
  estimatedMinutes: number
}

export type StageGate = {
  key: 'onboarding' | 'level1' | 'level2' | 'final' | 'certification'
  label: string
  state: 'locked' | 'current' | 'completed'
  explanation: string
}

export type Evaluation = {
  items: EvaluatedItem[]
  status: EnrolmentStatus
  progressPercent: number
  currentStage: string
  complete: boolean
  /** Program A only: every condition for the demo certificate passes. */
  certificateEligible: boolean
  nextItem: EvaluatedItem | null
  gates: StageGate[]
  remainingMinutes: number
}

// ---------------------------------------------------------------------------------------------
// Evidence helpers
// ---------------------------------------------------------------------------------------------

const submitted = (attempts: readonly AttemptEvidence[], kind: AttemptEvidence['kind']) =>
  attempts.filter((a) => a.kind === kind && a.status === 'submitted' && a.score !== null)

export function bestScore(attempts: readonly AttemptEvidence[], kind: AttemptEvidence['kind']) {
  const scores = submitted(attempts, kind).map((a) => a.score as number)
  return scores.length > 0 ? Math.max(...scores) : null
}

/** The baseline: the first submitted pre-assessment. */
export function baselineAttempt(attempts: readonly AttemptEvidence[]) {
  return submitted(attempts, 'pre').sort((a, b) => a.attemptNo - b.attemptNo)[0] ?? null
}

/** The latest submitted post-assessment: the one matched against the baseline. */
export function latestPostAttempt(attempts: readonly AttemptEvidence[]) {
  return submitted(attempts, 'post').sort((a, b) => b.attemptNo - a.attemptNo)[0] ?? null
}

/** Assignment approved with at least the pass mark (brief §6: at least 70). */
export function assignmentApproved(submissions: readonly SubmissionEvidence[]) {
  return submissions.some(
    (s) => s.review?.status === 'approved' && s.review.score >= THRESHOLDS.assignmentPass,
  )
}

/** The newest version is waiting for a trainer. */
export function assignmentAwaitingReview(submissions: readonly SubmissionEvidence[]) {
  const latest = [...submissions].sort((a, b) => b.version - a.version)[0]
  return Boolean(latest && (latest.status === 'submitted' || latest.status === 'under_review'))
}

const unitDone = (e: Evidence, code: string | null) =>
  code !== null && e.units.get(code)?.status === 'completed'

const unitStarted = (e: Evidence, code: string | null) =>
  code !== null && (e.units.get(code)?.status ?? 'not_started') !== 'not_started'

// ---------------------------------------------------------------------------------------------
// Item satisfaction
// ---------------------------------------------------------------------------------------------

const ITEM_MINUTES: Record<PathItemKind, number> = {
  course: 8,
  assessment_pre: 8,
  assessment_post: 8,
  assessment_formative: 6,
  ai_practice: 6,
  session: 60,
  assignment: 45,
}

export function itemMinutes(item: PathItemInput, programme: ProgrammeCode): number {
  if (item.kind === 'course' && item.durationMinutes !== null) return item.durationMinutes
  if (item.kind === 'ai_practice') {
    const scenario = ROLEPLAY_SCENARIOS.find((s) => s.key === item.scenarioKey)
    return scenario?.estimatedMinutes ?? ITEM_MINUTES.ai_practice
  }
  if (item.kind === 'assignment') return programme === 'A' ? 45 : 15
  if (item.kind === 'session') return item.durationMinutes ?? ITEM_MINUTES.session
  return ITEM_MINUTES[item.kind]
}

/** Is this path item's requirement met? Thresholds come from shared/constants. */
export function itemSatisfied(e: Evidence, item: PathItemInput): boolean {
  switch (item.kind) {
    case 'assessment_pre':
      return submitted(e.attempts, 'pre').length > 0
    case 'assessment_post':
      // B: the post-assessment is required but no score blocks completion (brief §5).
      // A: the final assessment needs at least 80 (brief §6).
      return e.programme === 'A'
        ? (bestScore(e.attempts, 'post') ?? -1) >= THRESHOLDS.finalAssessmentPass
        : submitted(e.attempts, 'post').length > 0
    case 'assessment_formative':
      return (bestScore(e.attempts, 'formative') ?? -1) >= THRESHOLDS.foundationQuizPass
    case 'ai_practice':
      // One completed role-play in either mode; the score is advisory (brief §5, §6).
      return e.rolePlayCount > 0
    case 'session':
      return e.session.passed || unitDone(e, item.courseCode)
    case 'assignment':
      return assignmentApproved(e.submissions)
    case 'course':
      // Program B's C05 short response completes when a trainer approves it (brief §5).
      if (e.programme === 'B' && item.courseCode === 'C05') {
        return unitDone(e, 'C05') || assignmentApproved(e.submissions)
      }
      return unitDone(e, item.courseCode)
  }
}

function itemStarted(e: Evidence, item: PathItemInput): boolean {
  switch (item.kind) {
    case 'assessment_pre':
    case 'assessment_post':
    case 'assessment_formative': {
      const kind =
        item.kind === 'assessment_pre'
          ? 'pre'
          : item.kind === 'assessment_post'
            ? 'post'
            : 'formative'
      return e.attempts.some((a) => a.kind === kind)
    }
    case 'session':
      return e.session.booked || e.session.awaitingScore || unitStarted(e, item.courseCode)
    case 'assignment':
      return e.submissions.length > 0
    case 'course':
      return (
        unitStarted(e, item.courseCode) ||
        (e.programme === 'B' && item.courseCode === 'C05' && e.submissions.length > 0)
      )
    case 'ai_practice':
      return false
  }
}

// ---------------------------------------------------------------------------------------------
// Gates (Program A stages, brief §6) and lock reasons
// ---------------------------------------------------------------------------------------------

type GateFacts = {
  baseline: boolean
  level1Units: boolean
  quiz: boolean
  practice: boolean
  level1: boolean
  session: boolean
  assignment: boolean
  final: boolean
}

function gateFacts(e: Evidence): GateFacts {
  const required = e.items.filter((i) => i.required)
  const done = (pred: (i: PathItemInput) => boolean) =>
    required.filter(pred).every((i) => itemSatisfied(e, i))
  const baseline = done((i) => i.kind === 'assessment_pre')
  const level1Units = done((i) => i.kind === 'course' && i.level === 1)
  const quiz = done((i) => i.kind === 'assessment_formative')
  const practice = done((i) => i.kind === 'ai_practice')
  return {
    baseline,
    level1Units,
    quiz,
    practice,
    level1: baseline && level1Units && quiz,
    session: done((i) => i.kind === 'session'),
    assignment: done((i) => i.kind === 'assignment'),
    final: done((i) => i.kind === 'assessment_post'),
  }
}

function lockReasonFor(e: Evidence, item: PathItemInput, f: GateFacts): string | null {
  if (item.kind === 'assessment_pre') return null
  if (!f.baseline) return 'Complete the baseline assessment first. It is not an entry barrier.'

  if (e.programme === 'B') {
    if (item.kind === 'assessment_post') {
      const lessons = e.items.filter(
        (i) =>
          i.required &&
          ((i.kind === 'course' && i.courseCode !== 'C05') || i.kind === 'ai_practice'),
      )
      if (!lessons.every((i) => itemSatisfied(e, i))) {
        return 'Opens after your core lessons and one practice conversation.'
      }
    }
    return null
  }

  if (e.programme === 'A') {
    if (item.kind === 'assessment_formative' && !f.level1Units) {
      return 'Complete the four foundation units to open the quiz.'
    }
    if (item.level >= 2 && item.kind !== 'assessment_post' && !f.level1) {
      return 'Level 2 opens when the foundation units are complete and the foundation quiz is at least 80 percent.'
    }
    if (item.kind === 'assessment_post' && !(f.level1 && f.session && f.assignment)) {
      return 'The final assessment opens after an attended, scored session and an approved assignment.'
    }
  }
  return null
}

function gatesFor(e: Evidence, f: GateFacts, complete: boolean): StageGate[] {
  if (e.programme !== 'A') return []
  const level2 = f.session && f.assignment
  const stages: Omit<StageGate, 'state'>[] = [
    {
      key: 'onboarding',
      label: 'Onboarding',
      explanation: 'Programme enrolment, profile and five-question baseline.',
    },
    {
      key: 'level1',
      label: 'Level 1',
      explanation:
        'Foundation learning and AI practice. Required units complete and foundation quiz at least 80 percent.',
    },
    {
      key: 'level2',
      label: 'Level 2',
      explanation:
        'Trainer-led application and practical assignment. Attendance with a session score of at least 70 and an assignment of at least 70.',
    },
    {
      key: 'final',
      label: 'Final assessment',
      explanation: 'Parallel post-assessment with competency comparison. At least 80 percent.',
    },
    {
      key: 'certification',
      label: 'Certification',
      explanation:
        'The system checks every required condition before issuing the demo certificate.',
    },
  ]
  const done = [f.baseline, f.level1 && f.practice, level2, f.final, complete]
  const firstOpen = done.indexOf(false)
  return stages.map((stage, index) => ({
    ...stage,
    state: done[index] ? 'completed' : index === firstOpen ? 'current' : 'locked',
  }))
}

function stageLabel(e: Evidence, f: GateFacts, complete: boolean): string {
  if (e.programme === 'B') return 'Visitor Service Essentials'
  if (e.programme === 'C') return 'Sample overview'
  if (complete) return 'Certification'
  if (!f.baseline) return 'Onboarding'
  if (!f.level1) return 'Level 1: Foundation learning'
  if (!f.practice) return 'Level 1: AI practice'
  if (!f.session) return 'Level 2: Trainer-led application'
  if (!f.assignment) return 'Level 2: Practical assignment'
  return 'Final assessment'
}

// ---------------------------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------------------------

export function evaluate(e: Evidence): Evaluation {
  const f = gateFacts(e)
  const items: EvaluatedItem[] = [...e.items]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const done = itemSatisfied(e, item)
      const lockReason = done ? null : lockReasonFor(e, item, f)
      const state: ItemState = done
        ? 'completed'
        : lockReason
          ? 'locked'
          : itemStarted(e, item)
            ? 'in_progress'
            : 'available'
      return { ...item, state, lockReason, estimatedMinutes: itemMinutes(item, e.programme) }
    })

  const required = items.filter((i) => i.required)
  const doneCount = required.filter((i) => i.state === 'completed').length
  const complete = required.length > 0 && doneCount === required.length
  const certificateEligible = e.programme === 'A' && complete

  const anyActivity =
    e.attempts.length > 0 ||
    e.rolePlayCount > 0 ||
    e.submissions.length > 0 ||
    [...e.units.values()].some((u) => u.status !== 'not_started')

  const awaiting = e.submissions.length > 0 && assignmentAwaitingReview(e.submissions)

  const status: EnrolmentStatus = complete
    ? 'completed'
    : awaiting
      ? 'awaiting_review'
      : anyActivity
        ? 'in_progress'
        : 'not_started'

  const ratio = required.length === 0 ? 0 : doneCount / required.length
  const progressPercent = complete ? 100 : Math.min(99, Math.round(ratio * 100))

  // Program B practises before the short response (brief §5 steps 5 and 6), whatever the
  // path order says, so the next action follows the journey.
  const practicePosition = items.find((i) => i.kind === 'ai_practice')?.position
  const effective = (i: EvaluatedItem) =>
    e.programme === 'B' && i.courseCode === 'C05' && practicePosition !== undefined
      ? practicePosition + 0.5
      : i.position
  const open = (i: EvaluatedItem) => i.state === 'in_progress' || i.state === 'available'
  const byJourney = (list: EvaluatedItem[]) =>
    [...list].filter(open).sort((a, b) => effective(a) - effective(b))[0]
  const nextItem = byJourney(required) ?? byJourney(items) ?? null

  const remainingMinutes = required
    .filter((i) => i.state !== 'completed')
    .reduce((sum, i) => sum + i.estimatedMinutes, 0)

  return {
    items,
    status,
    progressPercent,
    currentStage: stageLabel(e, f, complete),
    complete,
    certificateEligible,
    nextItem,
    gates: gatesFor(e, f, complete),
    remainingMinutes,
  }
}

/** Level 1 complete (baseline, foundation units, quiz at least 80): the booking prerequisite. */
export function level1Complete(e: Evidence): boolean {
  return gateFacts(e).level1
}
