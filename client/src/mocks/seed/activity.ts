import { COMPETENCIES, type Competency } from '@shared/constants'
import { QUESTION_BANK } from '@shared/content/assessments'
import { COURSE_BY_CODE, isLibraryCourse } from '@shared/content/curriculum'
import { type RuleProfile, resolvePathRule } from '@shared/content/paths'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import type { Catalogue } from './catalogue'
import { stableUuid, userIds } from './ids'
import type { LearnerSeed } from './learners'
import { PERSONA_SCORES } from './personas'
import { type EnrolmentPlan, type SeedPlan, type Stage, stageMinAge } from './plan'
import type { Calendar } from './reference-date'
import type { Rng } from './rng'
import {
  buildRolePlay,
  REVIEW_FEEDBACK_APPROVED,
  REVIEW_FEEDBACK_RETURNED,
  sampleResponseText,
} from './roleplay-text'
import type { SeedRow } from './rows'
import type { SessionsResult } from './sessions'
import { TRAINERS } from './trainers'

type EnrolmentInsert = SeedRow<'enrolments'>
type UnitInsert = SeedRow<'unitProgress'>
type AttemptInsert = SeedRow<'assessmentAttempts'>
type AnswerInsert = SeedRow<'assessmentAnswers'>
type RolePlayInsert = SeedRow<'rolePlayAttempts'>
type SubmissionInsert = SeedRow<'submissions'>
type ReviewInsert = SeedRow<'reviews'>
type CertificateInsert = SeedRow<'certificates'>
type NotificationInsert = SeedRow<'notifications'>

export type ActivityResult = {
  enrolments: EnrolmentInsert[]
  units: UnitInsert[]
  attempts: AttemptInsert[]
  answers: AnswerInsert[]
  rolePlays: RolePlayInsert[]
  submissions: SubmissionInsert[]
  reviews: ReviewInsert[]
  certificates: CertificateInsert[]
  notifications: NotificationInsert[]
  /** Registration and last-activity instants per learner user ID. */
  learnerDates: Map<string, { registeredAt: Date; lastActivityAt: Date | null }>
  /** (enrolment id, certificate code) for the audit trail. */
  certificateAudit: { code: string; learnerId: string; issuedAt: Date; enrolmentId: string }[]
}

const A_UNIT_ORDER = ['C01', 'C03', 'C04', 'C02'] as const

const PRE_WEIGHTS: Record<Competency, number> = {
  discover_needs: 0.8,
  verify_information: 1.2,
  communicate_clearly: 1.3,
  recover_service: 0.7,
  protect_information: 1,
}

const INACTIVE_ELIGIBLE: Stage[] = [
  'l1_early',
  'l1_late',
  'l1_failed_quiz',
  'l1_done',
  'b_early',
  'b_mid',
  'b_practice',
  'c_viewing',
]

type SubmissionPlan = {
  version: number
  subAgo: number
  status: SubmissionInsert['status']
  review: { ago: number; score: number; status: 'returned' | 'approved'; feedback: string } | null
}

/** Descending "days ago" values from `startAgo` to `endAgo`; the last is exactly `endAgo`. */
function spaced(rng: Rng, startAgo: number, endAgo: number, count: number): number[] {
  if (count <= 0) return []
  const span = Math.max(0, startAgo - endAgo)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const base = startAgo - (span * (i + 1)) / count
    const jitter = i === count - 1 ? 0 : rng.float(-0.12, 0.12) * (span / count)
    out.push(Math.max(endAgo, Math.min(startAgo, base + jitter)))
  }
  return out.sort((a, b) => b - a)
}

/** A chain of descending times starting at `from`, each step a random gap, never below 0.1. */
function chain(rng: Rng, from: number, gaps: readonly (readonly [number, number])[]): number[] {
  const out: number[] = []
  let current = from
  for (const [min, max] of gaps) {
    current = Math.max(0.1, current - rng.float(min, max))
    out.push(current)
  }
  return out
}

function pickCompetencies(rng: Rng, count: number, weights = PRE_WEIGHTS): Set<Competency> {
  const remaining = [...COMPETENCIES]
  const chosen = new Set<Competency>()
  while (chosen.size < count && remaining.length > 0) {
    const pick = rng.weighted(remaining.map((c) => [c, weights[c]] as const))
    chosen.add(pick)
    remaining.splice(remaining.indexOf(pick), 1)
  }
  return chosen
}

const mapToSet = (map: Record<Competency, boolean>) => new Set(COMPETENCIES.filter((c) => map[c]))

export function buildActivity(
  rootRng: Rng,
  cal: Calendar,
  catalogue: Catalogue,
  plan: SeedPlan,
  learners: readonly LearnerSeed[],
  sessions: SessionsResult,
): ActivityResult {
  const rng = rootRng.fork('activity')
  const out: ActivityResult = {
    enrolments: [],
    units: [],
    attempts: [],
    answers: [],
    rolePlays: [],
    submissions: [],
    reviews: [],
    certificates: [],
    notifications: [],
    learnerDates: new Map(),
    certificateAudit: [],
  }
  const { ids } = catalogue
  const DAY = cal.DAY_MS
  const agoDate = (days: number) => cal.ago(days)
  const sessionAgo = (date: Date) => (cal.nowMs - date.getTime()) / DAY

  const byLearner = new Map<number, EnrolmentPlan[]>()
  for (const e of plan.enrolments) {
    const list = byLearner.get(e.learner.n) ?? []
    list.push(e)
    byLearner.set(e.learner.n, list)
  }

  // Overdue marking: the 15 submitted A enrolments whose sessions are oldest.
  const submittedA = plan.enrolments
    .filter((e) => e.programme === 'A' && e.stage === 'submitted')
    .sort((a, b) => {
      const sa = sessions.completedLinks.get(a.id)?.startsAt.getTime() ?? 0
      const sb = sessions.completedLinks.get(b.id)?.startsAt.getTime() ?? 0
      return sa - sb || a.learner.n - b.learner.n
    })
  const overdueA = new Set(submittedA.slice(0, 15).map((e) => e.id))
  const overdueB = new Set(
    plan.enrolments
      .filter((e) => e.programme === 'B' && e.stage === 'b_review')
      .slice(0, 8)
      .map((e) => e.id),
  )

  const trainerUser = (n: number) => userIds.trainer(n)
  const trainerId = (n: number) => (TRAINERS.find((t) => t.n === n) as (typeof TRAINERS)[number]).id
  const pickMarkerA = (r: Rng) =>
    r.weighted([
      [10, 40],
      [1, 10],
      [2, 10],
      [3, 10],
      [4, 10],
      [5, 10],
      [7, 10],
    ] as const)
  const pickMarkerB = (r: Rng) =>
    r.weighted([
      [6, 60],
      [10, 40],
    ] as const)

  let certificateSeq = 0
  const completedAOrdered = plan.enrolments
    .filter((e) => e.programme === 'A' && e.stage === 'completed')
    .sort((a, b) => a.learner.n - b.learner.n)
  const certificateNumber = new Map(completedAOrdered.map((e, i) => [e.id, i + 1]))

  let overridesLeft = 3

  for (const e of plan.enrolments) {
    const r = rng.fork(e.id)
    const { learner, programme, stage } = e
    const age = plan.ageDays.get(learner.n) as number
    const enrolAge =
      (byLearner.get(learner.n) ?? []).length > 1
        ? r.int(Math.min(age, stageMinAge(stage)), age)
        : age
    const enrolledAt = agoDate(enrolAge)
    const link = sessions.completedLinks.get(e.id)
    const S = link ? sessionAgo(link.startsAt) : null
    const booked = sessions.firstBookedAt.get(e.id)
    const bookedAgo = booked ? sessionAgo(booked) : null

    // --- Path ---------------------------------------------------------------------------
    const ruleProfile: RuleProfile = {
      organisationType: learner.orgType,
      organisation: learner.organisation.name,
      jobFunction: learner.jobFunction,
      jobTitle: learner.jobTitle,
      seniority: learner.seniority,
      experience: learner.experience,
      goals: learner.goals,
      complete: learner.profileComplete,
    }
    const resolution = resolvePathRule(programme, ruleProfile)
    let pathCode = resolution.rule.pathCode
    let assignmentReason = resolution.reason
    let overrideReason: string | null = null
    if (
      programme === 'B' &&
      pathCode === 'B-GENERAL' &&
      learner.orgType === 'hotel_accommodation' &&
      !learner.persona &&
      overridesLeft > 0 &&
      stage !== 'not_started'
    ) {
      overridesLeft -= 1
      pathCode = 'B-HOTEL'
      overrideReason =
        'Administrator override: works in hotel guest services, profile was incomplete at enrolment.'
      assignmentReason = `${resolution.reason}; overridden by an administrator`
    }
    const pathItems = catalogue.ids.pathItems[pathCode] ?? []

    // --- Last activity ------------------------------------------------------------------
    const canBeInactive = INACTIVE_ELIGIBLE.includes(stage) && enrolAge >= 20 && !booked
    let lastAgo: number
    if (stage === 'not_started') lastAgo = enrolAge
    else if (learner.n === 1) lastAgo = 1.5
    else if (learner.n === 2) lastAgo = 2
    else if (bookedAgo !== null && stage === 'l1_done') lastAgo = Math.max(0.1, bookedAgo)
    else if (canBeInactive && r.chance(0.3)) lastAgo = r.float(15, Math.min(60, enrolAge - 3))
    else lastAgo = r.float(0.2, Math.max(0.5, Math.min(13, enrolAge - 1)))

    const units: UnitInsert[] = []
    const unitStatus = new Map<string, string>()
    const unit = (
      code: string,
      status: NonNullable<UnitInsert['status']>,
      percent: number,
      completedAgo: number | null,
      lastUnitAgo: number,
      extra: Partial<UnitInsert> = {},
    ) => {
      const course = COURSE_BY_CODE[code]
      if (!course) throw new Error(`Unknown course ${code}`)
      const lastActivityAt = agoDate(lastUnitAgo)
      unitStatus.set(code, status)
      units.push({
        id: stableUuid('unit', `${e.id}:${code}`),
        enrolmentId: e.id,
        courseId: ids.course[code] as string,
        status,
        percent,
        completedAt: completedAgo === null ? null : agoDate(completedAgo),
        lastActivityAt,
        source: 'learner',
        createdAt: lastActivityAt,
        updatedAt: lastActivityAt,
        ...extra,
      })
    }
    const scormExtra = (code: string, done: boolean, score: number | null): Partial<UnitInsert> =>
      code === 'C04'
        ? {
            cmiCompletionStatus: done ? 'completed' : 'incomplete',
            cmiSuccessStatus: done ? 'passed' : 'unknown',
            scoreRaw: score,
            sessionTimeSeconds: done ? r.int(540, 900) : r.int(120, 400),
            suspendData: done ? null : 'resume:scene-3',
            location: done ? 'scene-5' : 'scene-3',
          }
        : code === 'C02'
          ? { scoreRaw: score, sessionTimeSeconds: done ? r.int(300, 520) : r.int(60, 240) }
          : {}

    // --- Assessment helpers -------------------------------------------------------------
    const attemptRows = (
      kind: 'pre' | 'post' | 'formative',
      attemptNo: number,
      correct: Set<Competency>,
      submittedAgo: number,
    ) => {
      const variant = kind === 'post' ? 'post' : 'baseline'
      const assessmentId =
        kind === 'pre'
          ? ids.assessment.pre
          : kind === 'post'
            ? ids.assessment.post
            : ids.assessment.formative
      const attemptId = stableUuid('attempt', `${e.id}:${kind}:${attemptNo}`)
      const submittedAt = agoDate(submittedAgo)
      const startedAt = new Date(submittedAt.getTime() - r.int(6, 14) * 60_000)
      const competencyScores: Record<string, number> = {}
      for (const question of QUESTION_BANK[variant]) {
        const isCorrect = correct.has(question.competency)
        competencyScores[question.competency] = isCorrect ? 20 : 0
        out.answers.push({
          id: stableUuid('answer', `${attemptId}:${question.competency}`),
          attemptId,
          competency: question.competency,
          selectedOption: isCorrect ? 'B' : r.pick(['A', 'C']),
          points: isCorrect ? 20 : 0,
          createdAt: submittedAt,
          updatedAt: submittedAt,
        })
      }
      const score = correct.size * 20
      out.attempts.push({
        id: attemptId,
        assessmentId,
        enrolmentId: e.id,
        learnerId: learner.userId,
        attemptNo,
        status: 'submitted',
        score,
        competencyScores,
        startedAt,
        submittedAt,
        createdAt: startedAt,
        updatedAt: submittedAt,
      })
      return score
    }

    const rolePlay = (
      scenarioKey: string,
      completedAgo: number,
      quality: number,
      attemptNo = 1,
    ) => {
      const draft = buildRolePlay(r, scenarioKey, quality)
      const [s0, s1, s2, s3, s4] = draft.scores as [number, number, number, number, number]
      const completedAt = agoDate(completedAgo)
      out.rolePlays.push({
        id: stableUuid('roleplay', `${e.id}:${attemptNo}`),
        enrolmentId: e.id,
        learnerId: learner.userId,
        scenarioKey,
        mode: r.chance(0.72) ? 'text' : 'voice',
        transcript: draft.transcript,
        empathyScore: s0,
        discoveryScore: s1,
        clarityScore: s2,
        accuracyScore: s3,
        solutionScore: s4,
        totalScore: draft.total,
        totalPercent: draft.total * 5,
        feedback: draft.feedback,
        usedRecordedDemo: false,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      })
    }

    const submissionRows = (kind: 'A' | 'B', plans: SubmissionPlan[], markerN: number) => {
      const assignmentId = kind === 'A' ? ids.assignment.A : ids.assignment.B
      for (const sp of plans) {
        const submissionId = stableUuid('submission', `${e.id}:${kind}:${sp.version}`)
        const submittedAt = agoDate(sp.subAgo)
        const written = kind === 'B' || r.chance(0.7)
        const words = kind === 'B' ? r.int(100, 150) : r.int(300, 500)
        const isVideo = !written && r.chance(0.15)
        out.submissions.push({
          id: submissionId,
          assignmentId,
          enrolmentId: e.id,
          learnerId: learner.userId,
          version: sp.version,
          status: sp.status,
          responseText: written ? sampleResponseText(r, words) : null,
          wordCount: written ? words : null,
          fileName: written
            ? null
            : isVideo
              ? `${learner.code}-roleplay-v${sp.version}.mp4`
              : `${learner.code}-response-plan-v${sp.version}.${r.chance(0.6) ? 'pdf' : 'docx'}`,
          mimeType: written
            ? null
            : isVideo
              ? 'video/mp4'
              : r.chance(0.6)
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          sizeBytes: written
            ? null
            : isVideo
              ? r.int(8, 40) * 1024 * 1024
              : r.int(150, 4000) * 1024,
          storagePath: written ? null : `uploads/seed/${learner.code}/${kind}-v${sp.version}`,
          markerTrainerId: trainerId(markerN),
          submittedAt,
          createdAt: submittedAt,
          updatedAt: submittedAt,
        })
        if (sp.review) {
          const reviewedAt = agoDate(sp.review.ago)
          out.reviews.push({
            id: stableUuid('review', submissionId),
            submissionId,
            reviewerId: trainerUser(markerN),
            rubricScore: sp.review.score,
            rubricBreakdown: kind === 'A' ? splitScore(sp.review.score) : null,
            feedback: sp.review.feedback,
            status: sp.review.status,
            reviewedAt,
            createdAt: reviewedAt,
            updatedAt: reviewedAt,
          })
          if (sp.review.status === 'returned') {
            const eventId = `evt-return-${submissionId}`
            out.notifications.push({
              id: stableUuid('notification', `${eventId}:in_app`),
              eventId,
              kind: 'assignment_returned',
              recipientId: learner.userId,
              channel: 'in_app',
              state: 'sent',
              subject: 'Your assignment has been returned for revision',
              body: `Hello ${learner.fullName.split(' ')[0]}, your trainer has returned your submission with feedback. Please review it in Assignments and submit a revised version.`,
              sessionId: null,
              actorId: trainerUser(markerN),
              createdAt: reviewedAt,
              updatedAt: reviewedAt,
            })
          }
        }
      }
    }

    const splitScore = (score: number): Record<string, number> => {
      const a = Math.min(25, Math.round(score / 4 + r.int(-2, 2)))
      const b = Math.min(25, Math.round(score / 4 + r.int(-2, 2)))
      const c = Math.min(25, Math.round(score / 4 + r.int(-2, 2)))
      return {
        discovery: Math.max(0, a),
        options: Math.max(0, b),
        escalation: Math.max(0, c),
        followup: Math.max(0, Math.min(25, score - a - b - c)),
      }
    }

    const approvedReview = (ago: number) => ({
      ago,
      score: r.int(72, 96),
      status: 'approved' as const,
      feedback: r.pick(REVIEW_FEEDBACK_APPROVED),
    })
    const returnedReview = (ago: number, feedback?: string, score?: number) => ({
      ago,
      score: score ?? r.int(52, 68),
      status: 'returned' as const,
      feedback: feedback ?? r.pick(REVIEW_FEEDBACK_RETURNED),
    })

    // --- Programme timelines ------------------------------------------------------------
    let progressPercent = 0
    let startedAgo: number | null = null
    let completedAgo: number | null = null
    let currentStage = 'Onboarding'
    const scenarioKeys = ROLEPLAY_SCENARIOS.map((s) => s.key)

    if (programme === 'A') {
      const notStarted = stage === 'not_started'
      const unitsDone =
        stage === 'l1_early'
          ? r.int(0, 2)
          : stage === 'l1_late'
            ? learner.n === 3
              ? 3
              : r.int(3, 4)
            : 4
      const l1Complete = !['not_started', 'l1_early', 'l1_late', 'l1_failed_quiz'].includes(stage)
      const l1Passed = l1Complete
      const beyond = [
        'attended',
        'absent',
        'returned',
        'submitted',
        'resubmitted',
        'completed',
      ].includes(stage)

      if (!notStarted) {
        const quizFails =
          stage === 'l1_failed_quiz' ? r.int(1, 2) : l1Complete && r.chance(0.3) ? 1 : 0
        const quizPass = l1Complete
        const hasAi =
          stage === 'completed' ||
          (beyond
            ? r.chance(0.9)
            : stage === 'l1_done'
              ? r.chance(0.85)
              : stage === 'l1_late'
                ? r.chance(0.3)
                : stage === 'l1_failed_quiz'
                  ? r.chance(0.5)
                  : false)
        const hasC05 = beyond || (stage === 'l1_done' && r.chance(0.4))

        const keys: string[] = ['pre']
        for (let i = 0; i < unitsDone; i++) keys.push(`unit${i}`)
        for (let i = 0; i < quizFails; i++) keys.push(`quizfail${i}`)
        if (quizPass) keys.push('quizpass')
        if (hasAi) keys.push('ai')
        if (hasC05) keys.push('c05')

        // Phase 1 must end before the session (or before the first booking).
        let phase1End = lastAgo
        if (S !== null) phase1End = Math.max(S + 3, lastAgo)
        else if (stage === 'completed') phase1End = lastAgo + (enrolAge - lastAgo) * 0.55
        else if (bookedAgo !== null) phase1End = bookedAgo + 0.5
        if (stage === 'completed' && S === null) phase1End = Math.max(phase1End, 5)
        const times = spaced(
          r.fork('p1'),
          enrolAge - 0.1,
          Math.min(phase1End, enrolAge - 0.2),
          keys.length,
        )
        const at = new Map(keys.map((key, i) => [key, times[i] as number]))
        startedAgo = at.get('pre') as number

        // Pre-assessment.
        const persona = PERSONA_SCORES[learner.n as 1 | 5] as
          | { pre?: Record<Competency, boolean>; post?: Record<Competency, boolean> }
          | undefined
        const preCorrect = persona?.pre
          ? mapToSet(persona.pre)
          : pickCompetencies(
              r,
              r.weighted([
                [0, 3],
                [1, 20],
                [2, 35],
                [3, 27],
                [4, 12],
                [5, 3],
              ] as const),
            )
        attemptRows('pre', 1, preCorrect, at.get('pre') as number)

        // Foundation units, in path order.
        A_UNIT_ORDER.forEach((code, i) => {
          if (i < unitsDone) {
            const doneAgo = at.get(`unit${i}`) as number
            const score = code === 'C04' || code === 'C02' ? r.int(80, 100) : null
            unit(code, 'completed', 100, doneAgo, doneAgo, scormExtra(code, true, score))
          } else if (i === unitsDone && stage !== 'l1_failed_quiz' && r.chance(0.65)) {
            const lastUnit = Math.min(lastAgo, enrolAge - 0.2)
            unit(code, 'in_progress', r.int(10, 80), null, lastUnit, scormExtra(code, false, null))
          }
        })

        for (let i = 0; i < quizFails; i++) {
          attemptRows(
            'formative',
            i + 1,
            pickCompetencies(r, r.int(2, 3), { ...PRE_WEIGHTS }),
            at.get(`quizfail${i}`) as number,
          )
        }
        if (quizPass) {
          attemptRows(
            'formative',
            quizFails + 1,
            pickCompetencies(
              r,
              r.weighted([
                [4, 55],
                [5, 45],
              ] as const),
            ),
            at.get('quizpass') as number,
          )
        }
        if (hasAi) {
          const scenario = r.pick(scenarioKeys)
          rolePlay(scenario, at.get('ai') as number, r.float(0.45, 0.85))
        }
        if (hasC05) {
          const doneAgo = at.get('c05') as number
          unit('C05', 'completed', 100, doneAgo, doneAgo)
        } else if (stage === 'l1_done' && r.chance(0.3)) {
          unit('C05', 'in_progress', r.int(20, 70), null, Math.min(lastAgo, phase1End))
        }

        // Phase 2: session, assignment, final assessment.
        if (
          link &&
          ['attended', 'late'].includes(link.attendance) &&
          link.scoreStatus === 'final' &&
          (link.scoreTotal ?? 0) >= 70
        ) {
          unit('C06', 'completed', 100, sessionAgo(link.startsAt), sessionAgo(link.startsAt))
        } else if (link && link.scoreStatus === 'draft') {
          unit('C06', 'in_progress', 50, null, sessionAgo(link.startsAt))
        } else if (stage === 'completed' && !link) {
          const historical = Math.max(0.5, phase1End - 1)
          unit('C06', 'completed', 100, historical, historical, { source: 'historical' })
        }

        const marker = pickMarkerA(r)
        const sessionDayAgo = S ?? Math.max(1, phase1End - 1)
        if (stage === 'returned') {
          const sub1 =
            learner.n === 4
              ? Math.min(4, (S ?? 6) - 0.5)
              : r.float(Math.min(3, (S as number) - 0.6), (S as number) - 0.4)
          const [ret1] = chain(r, sub1, [[0.6, 1.4]])
          submissionRows(
            'A',
            [
              {
                version: 1,
                subAgo: sub1,
                status: 'returned',
                review: returnedReview(
                  ret1 as number,
                  learner.n === 4
                    ? 'Good discovery questions and a clear first option. Your escalation path is missing: say who you would involve and when. Please add a follow-up message and resubmit.'
                    : undefined,
                  learner.n === 4 ? 62 : undefined,
                ),
              },
            ],
            marker,
          )
          lastAgo = sub1
        } else if (stage === 'submitted') {
          const upper = (S as number) - 0.5
          const sub1 =
            overdueA.has(e.id) && upper >= 6.2
              ? r.float(6.1, upper)
              : r.float(0.3, Math.min(5, upper))
          submissionRows(
            'A',
            [
              {
                version: 1,
                subAgo: sub1,
                status: r.chance(0.2) ? 'under_review' : 'submitted',
                review: null,
              },
            ],
            marker,
          )
          lastAgo = sub1
        } else if (stage === 'resubmitted') {
          const sub1 = r.float(3.5, Math.max(3.6, (S as number) - 0.4))
          const [ret1, sub2] = chain(r, sub1, [
            [0.8, 1.6],
            [0.5, 1.2],
          ])
          submissionRows(
            'A',
            [
              {
                version: 1,
                subAgo: sub1,
                status: 'returned',
                review: returnedReview(ret1 as number),
              },
              { version: 2, subAgo: sub2 as number, status: 'submitted', review: null },
            ],
            marker,
          )
          lastAgo = sub2 as number
        } else if (stage === 'completed') {
          const revised = r.chance(0.25)
          const start = S !== null ? S - r.float(0.4, 1) : Math.max(1, sessionDayAgo - 1) - 0.5
          const base = Math.max(S !== null ? 3.7 : 0.6, start)
          if (revised) {
            const [ret1, sub2, rev2, post] = chain(r, base, [
              [0.5, 1],
              [0.3, 0.8],
              [0.4, 0.9],
              [0.2, 0.6],
            ])
            submissionRows(
              'A',
              [
                {
                  version: 1,
                  subAgo: base,
                  status: 'returned',
                  review: returnedReview(ret1 as number),
                },
                {
                  version: 2,
                  subAgo: sub2 as number,
                  status: 'approved',
                  review: approvedReview(rev2 as number),
                },
              ],
              marker,
            )
            completedAgo = Math.max(0.1, (post as number) - 0.05)
            attemptRows('post', 1, postCorrectA(r), post as number)
          } else {
            const [rev1, post] = chain(r, base, [
              [0.5, 1],
              [0.2, 0.6],
            ])
            submissionRows(
              'A',
              [
                {
                  version: 1,
                  subAgo: base,
                  status: 'approved',
                  review: approvedReview(rev1 as number),
                },
              ],
              marker,
            )
            completedAgo = Math.max(0.1, (post as number) - 0.05)
            attemptRows('post', 1, postCorrectA(r), post as number)
          }
          lastAgo = completedAgo
        } else if (stage === 'attended' || stage === 'absent') {
          lastAgo = Math.max(0.1, (S as number) - 0.1)
        }
      }

      // Eleven path items: baseline, four foundation units, quiz, AI practice, C05, C06,
      // assignment, final assessment.
      const completedUnits = (codes: readonly string[]) =>
        codes.filter((code) => unitStatus.get(code) === 'completed').length
      let done = notStarted ? 0 : 1
      done += completedUnits(A_UNIT_ORDER)
      if (l1Passed) done += 1
      if (out.rolePlays.some((rp) => rp.enrolmentId === e.id)) done += 1
      done += completedUnits(['C05', 'C06'])
      if (stage === 'completed') done += 2
      progressPercent = stage === 'completed' ? 100 : Math.min(95, Math.round((done / 11) * 100))
      currentStage = notStarted
        ? 'Onboarding'
        : ['l1_early', 'l1_late', 'l1_failed_quiz'].includes(stage)
          ? 'Level 1: Foundation learning'
          : stage === 'l1_done' || stage === 'attended' || stage === 'absent'
            ? 'Level 2: Trainer-led application'
            : stage === 'completed'
              ? 'Certification'
              : 'Level 2: Practical assignment'
    } else if (programme === 'B') {
      const notStarted = stage === 'not_started'
      const orderedCourses = pathItems.filter(
        (p) =>
          p.kind === 'course' && p.courseCode !== 'C05' && !isLibraryCourse(p.courseCode ?? ''),
      )
      const unitsDone =
        stage === 'b_early' ? r.int(0, 1) : stage === 'b_mid' ? 2 : orderedCourses.length
      const hasAi = ['b_response', 'b_review', 'completed'].includes(stage)
      const hasSr = ['b_review', 'completed'].includes(stage)

      if (!notStarted) {
        const keys: string[] = ['pre']
        for (let i = 0; i < unitsDone; i++) keys.push(`unit${i}`)
        if (hasAi) keys.push('ai')
        if (hasSr) keys.push('srsub')
        if (stage === 'completed') keys.push('srrev', 'post')

        let endAgo = lastAgo
        if (stage === 'b_review')
          endAgo = overdueB.has(e.id) ? r.float(6.5, Math.min(12, enrolAge - 1)) : r.float(0.2, 5)
        if (stage === 'completed')
          endAgo = learner.n === 5 ? 3 : r.float(0.5, Math.max(1, enrolAge - 8))
        const times = spaced(
          r.fork('b'),
          enrolAge - 0.1,
          Math.min(endAgo, enrolAge - 0.2),
          keys.length,
        )
        const at = new Map(keys.map((key, i) => [key, times[i] as number]))
        startedAgo = at.get('pre') as number

        const persona = PERSONA_SCORES[learner.n as 1 | 5] as
          | { pre?: Record<Competency, boolean>; post?: Record<Competency, boolean> }
          | undefined
        const preCorrect = persona?.pre
          ? mapToSet(persona.pre)
          : pickCompetencies(
              r,
              r.weighted([
                [0, 3],
                [1, 20],
                [2, 35],
                [3, 27],
                [4, 12],
                [5, 3],
              ] as const),
            )
        attemptRows('pre', 1, preCorrect, at.get('pre') as number)

        orderedCourses.forEach((item, i) => {
          if (i >= unitsDone) return
          const code = item.courseCode as string
          const doneAgo = at.get(`unit${i}`) as number
          const score = code === 'C02' || code === 'C04' ? r.int(80, 100) : null
          unit(code, 'completed', 100, doneAgo, doneAgo, scormExtra(code, true, score))
        })
        if (stage === 'b_early' && unitsDone < orderedCourses.length && r.chance(0.6)) {
          const next = orderedCourses[unitsDone]?.courseCode as string
          unit(
            next,
            'in_progress',
            r.int(15, 80),
            null,
            Math.min(lastAgo, enrolAge - 0.2),
            scormExtra(next, false, null),
          )
        }

        if (hasAi) {
          const scenario =
            pathCode === 'B-HOTEL'
              ? 'changed-booking'
              : pathCode === 'B-TRANSPORT'
                ? 'unclear-directions'
                : r.pick(scenarioKeys)
          rolePlay(scenario, at.get('ai') as number, r.float(0.4, 0.9))
          if (stage === 'completed' && r.chance(0.3)) {
            rolePlay(scenario, (at.get('ai') as number) - 0.05, r.float(0.6, 1), 2)
          }
        }
        const marker = pickMarkerB(r)
        if (stage === 'b_review') {
          const sub = at.get('srsub') as number
          unit('C05', 'in_progress', 90, null, sub)
          submissionRows(
            'B',
            [
              {
                version: 1,
                subAgo: sub,
                status: r.chance(0.25) ? 'under_review' : 'submitted',
                review: null,
              },
            ],
            marker,
          )
          lastAgo = sub
        } else if (stage === 'completed') {
          const sub = at.get('srsub') as number
          const rev = at.get('srrev') as number
          const post = at.get('post') as number
          unit('C05', 'completed', 100, rev, rev)
          submissionRows(
            'B',
            [{ version: 1, subAgo: sub, status: 'approved', review: approvedReview(rev) }],
            marker,
          )
          const postCorrect = persona?.post
            ? mapToSet(persona.post)
            : pickCompetencies(
                r,
                r.weighted([
                  [5, 35],
                  [4, 45],
                  [3, 20],
                ] as const),
                {
                  discover_needs: 1,
                  verify_information: 1,
                  communicate_clearly: 1,
                  recover_service: 1,
                  protect_information: 1,
                },
              )
          attemptRows('post', 1, postCorrect, post)
          completedAgo = post
          lastAgo = post
        } else {
          lastAgo = endAgo
          // Maha's journey: last activity is her most recent completed lesson.
          if (learner.n === 1) lastAgo = 1.5
        }
      }

      const total = 7
      let done = notStarted ? 0 : 1
      done += orderedCourses.filter(
        (item) => unitStatus.get(item.courseCode as string) === 'completed',
      ).length
      if (out.rolePlays.some((rp) => rp.enrolmentId === e.id)) done += 1
      if (unitStatus.get('C05') === 'completed') done += 1
      if (stage === 'completed') done = total
      progressPercent = Math.min(100, Math.round((done / total) * 100))
      currentStage = 'Visitor Service Essentials'
    } else {
      // Program C: the C07 sample only.
      if (stage === 'c_viewing') {
        startedAgo = Math.min(enrolAge - 0.1, lastAgo + 1)
        unit('C07', 'in_progress', r.int(15, 85), null, lastAgo)
        progressPercent = 50
      } else if (stage === 'completed') {
        const doneAgo = r.float(1, Math.max(1.5, enrolAge - 3))
        startedAgo = Math.min(enrolAge - 0.1, doneAgo + 2)
        unit('C07', 'completed', 100, doneAgo, doneAgo)
        completedAgo = doneAgo
        lastAgo = doneAgo
        progressPercent = 100
      }
      currentStage = 'Sample overview'
    }

    if (stage === 'completed' && completedAgo === null) completedAgo = lastAgo
    if (stage === 'completed') progressPercent = 100

    out.units.push(...units)
    const lastActivityAt = stage === 'not_started' ? null : agoDate(lastAgo)
    out.enrolments.push({
      id: e.id,
      learnerId: learner.userId,
      programmeId: ids.programme[programme],
      status: e.status,
      pathId: ids.path[pathCode] as string,
      pathVersionId: ids.pathVersion[pathCode] as string,
      assignmentReason,
      overrideReason,
      overriddenBy: overrideReason ? userIds.admin : null,
      currentStage,
      progressPercent,
      enrolledAt,
      startedAt: startedAgo === null ? null : agoDate(startedAgo),
      completedAt: completedAgo === null ? null : agoDate(completedAgo),
      lastActivityAt,
      createdAt: enrolledAt,
      updatedAt: lastActivityAt ?? enrolledAt,
    })

    // Certificate for completed Program A, one per enrolment.
    if (programme === 'A' && stage === 'completed') {
      certificateSeq += 1
      const number = certificateNumber.get(e.id) ?? certificateSeq
      const issuedAt = new Date(
        agoDate(completedAgo === null ? 0.1 : completedAgo).getTime() + 5 * 60_000,
      )
      const issued = new Date(Math.min(issuedAt.getTime(), cal.nowMs - 60_000))
      const code = `QTA-DEMO-A-${String(number).padStart(6, '0')}`
      const finalAttempt = out.attempts.find(
        (a) => a.enrolmentId === e.id && a.assessmentId === ids.assessment.post,
      )
      out.certificates.push({
        id: stableUuid('certificate', code),
        code,
        enrolmentId: e.id,
        learnerId: learner.userId,
        programmeId: ids.programme.A,
        learnerName: learner.fullName,
        status: 'issued',
        issuedAt: issued,
        issuedBy: null,
        evidence: {
          foundationQuizAtLeast: 80,
          sessionScoreAtLeast: 70,
          assignmentScoreAtLeast: 70,
          finalAssessmentScore: finalAttempt?.score ?? null,
          checkedBy: 'system',
        },
        createdAt: issued,
        updatedAt: issued,
      })
      out.certificateAudit.push({
        code,
        learnerId: learner.userId,
        issuedAt: issued,
        enrolmentId: e.id,
      })
    }
  }

  // Learner registration and last activity.
  for (const learner of learners) {
    const age = plan.ageDays.get(learner.n) as number
    const registeredAt = agoDate(age)
    let latest: Date | null = null
    for (const e of byLearner.get(learner.n) ?? []) {
      const row = out.enrolments.find((x) => x.id === e.id)
      const date = row?.lastActivityAt ?? null
      if (date && (!latest || date > latest)) latest = date
    }
    out.learnerDates.set(learner.userId, { registeredAt, lastActivityAt: latest })
  }

  return out
}

function postCorrectA(r: Rng): Set<Competency> {
  return pickCompetencies(r, r.chance(0.5) ? 4 : 5, {
    discover_needs: 1,
    verify_information: 1,
    communicate_clearly: 1,
    recover_service: 1,
    protect_information: 1,
  })
}
