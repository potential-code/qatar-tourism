import type { EnrolmentStatus, ProgrammeCode } from '@shared/constants'
import { stableUuid } from './ids'
import type { Group, LearnerSeed } from './learners'
import { PERSONAS } from './personas'
import type { Rng } from './rng'

/**
 * The enrolment plan: which learner holds which programme, and how far along they are.
 *
 * Counts are the brief §15 grid exactly (A 60/180/60/120, B 90/240/30/300, C 30/90/0/60). A
 * "stage" refines a status so related records (sessions, submissions, certificates) can be made
 * consistent with it.
 */

export type StageA =
  | 'not_started'
  | 'l1_early' // Onboarding done, 0–2 foundation units
  | 'l1_late' // 3–4 foundation units, no quiz yet
  | 'l1_failed_quiz' // Foundation quiz below 80: failed prerequisite
  | 'l1_done' // Level 1 complete: eligible to book
  | 'attended' // Attended and scored; assignment not yet submitted
  | 'absent' // Absent or excused at the completed session; must rebook
  | 'returned' // Assignment returned for revision
  | 'submitted' // Assignment submitted, awaiting review
  | 'resubmitted' // Revision submitted, awaiting review
  | 'completed'

export type StageB =
  | 'not_started'
  | 'b_early' // Baseline done, 0–1 units
  | 'b_mid' // 2 of 3 units
  | 'b_practice' // All 3 lessons done; practice pending
  | 'b_response' // Practice done; short response pending
  | 'b_review' // Short response submitted, awaiting trainer review
  | 'completed'

export type StageC = 'not_started' | 'c_viewing' | 'completed'

export type Stage = StageA | StageB | StageC

export type EnrolmentPlan = {
  id: string
  learner: LearnerSeed
  programme: ProgrammeCode
  status: EnrolmentStatus
  stage: Stage
  /** Omar-style learners who are eligible but deliberately have no booking. */
  keepUnbooked: boolean
}

const A_COUNTS: readonly (readonly [StageA, number])[] = [
  ['not_started', 60],
  ['l1_early', 20],
  ['l1_late', 20],
  ['l1_failed_quiz', 15],
  ['l1_done', 85],
  ['attended', 17],
  ['absent', 10],
  ['returned', 13],
  ['submitted', 45],
  ['resubmitted', 15],
  ['completed', 120],
]

const B_COUNTS: readonly (readonly [StageB, number])[] = [
  ['not_started', 90],
  ['b_early', 80],
  ['b_mid', 80],
  ['b_practice', 40],
  ['b_response', 40],
  ['b_review', 30],
  ['completed', 300],
]

const C_COUNTS: readonly (readonly [StageC, number])[] = [
  ['not_started', 30],
  ['c_viewing', 90],
  ['completed', 60],
]

export function statusOf(stage: Stage): EnrolmentStatus {
  switch (stage) {
    case 'not_started':
      return 'not_started'
    case 'submitted':
    case 'resubmitted':
    case 'b_review':
      return 'awaiting_review'
    case 'completed':
      return 'completed'
    default:
      return 'in_progress'
  }
}

/** Minimum days a learner must have been registered for the stage to be plausible. */
const MIN_AGE: Record<string, number> = {
  not_started: 0,
  l1_early: 3,
  l1_late: 10,
  l1_failed_quiz: 12,
  l1_done: 30,
  attended: 32,
  absent: 32,
  returned: 34,
  submitted: 34,
  resubmitted: 36,
  completed: 40,
  b_early: 3,
  b_mid: 7,
  b_practice: 12,
  b_response: 14,
  b_review: 14,
  c_viewing: 5,
}

const PERSONA_AGE: Record<number, number> = { 1: 21, 2: 40, 3: 35, 4: 45, 5: 50, 42: 60 }

function expand<T>(counts: readonly (readonly [T, number])[]): T[] {
  return counts.flatMap(([stage, count]) => Array.from({ length: count }, () => stage))
}

function remove<T>(pool: T[], value: T) {
  const index = pool.indexOf(value)
  if (index === -1) throw new Error(`Persona stage ${String(value)} not available in the pool`)
  pool.splice(index, 1)
}

export type SeedPlan = {
  enrolments: EnrolmentPlan[]
  /** Days since registration, per learner number. */
  ageDays: Map<number, number>
}

export function buildPlan(rootRng: Rng, learners: LearnerSeed[]): SeedPlan {
  const rng = rootRng.fork('plan')

  const pools: Record<ProgrammeCode, Stage[]> = {
    A: expand(A_COUNTS),
    B: expand(B_COUNTS),
    C: expand(C_COUNTS),
  }

  const pinned = new Map<string, { stage: Stage; keepUnbooked: boolean }>()
  for (const persona of PERSONAS) {
    for (const enrolment of persona.enrolments) {
      const keepUnbooked = enrolment.stage === 'l1_done_unbooked'
      const stage = (keepUnbooked ? 'l1_done' : enrolment.stage) as Stage
      remove(pools[enrolment.programme], stage)
      pinned.set(`${persona.n}:${enrolment.programme}`, { stage, keepUnbooked })
    }
  }

  const shuffled: Record<ProgrammeCode, Stage[]> = {
    A: rng.fork('A').shuffle(pools.A),
    B: rng.fork('B').shuffle(pools.B),
    C: rng.fork('C').shuffle(pools.C),
  }

  const programmesOf = (group: Group): ProgrammeCode[] => (group === 'AB' ? ['A', 'B'] : [group])

  const enrolments: EnrolmentPlan[] = []
  for (const learner of learners) {
    for (const programme of programmesOf(learner.group)) {
      const pin = pinned.get(`${learner.n}:${programme}`)
      const stage = pin?.stage ?? (shuffled[programme].pop() as Stage)
      enrolments.push({
        id: stableUuid('enrolment', `${learner.code}:${programme}`),
        learner,
        programme,
        status: statusOf(stage),
        stage,
        keepUnbooked: pin?.keepUnbooked ?? false,
      })
    }
  }

  for (const programme of ['A', 'B', 'C'] as const) {
    if (shuffled[programme].length !== 0) {
      throw new Error(`Stage pool for programme ${programme} was not exhausted`)
    }
  }

  // Registration age per learner: old enough for their most advanced enrolment.
  const ageRng = rng.fork('age')
  const ageDays = new Map<number, number>()
  const byLearner = new Map<number, EnrolmentPlan[]>()
  for (const enrolment of enrolments) {
    const list = byLearner.get(enrolment.learner.n) ?? []
    list.push(enrolment)
    byLearner.set(enrolment.learner.n, list)
  }
  for (const learner of learners) {
    const own = byLearner.get(learner.n) ?? []
    const personaAge = PERSONA_AGE[learner.n]
    if (personaAge !== undefined) {
      ageDays.set(learner.n, personaAge)
      continue
    }
    const minAge = Math.max(...own.map((e) => MIN_AGE[e.stage] ?? 0))
    const allNotStarted = own.every((e) => e.stage === 'not_started')
    const maxAge = allNotStarted ? 60 : 90
    ageDays.set(learner.n, ageRng.int(minAge, Math.max(minAge, maxAge)))
    // Learners who never started and are still in a draft profile stopped at the wizard.
    if (allNotStarted && ageRng.chance(0.45)) learner.profileComplete = false
  }

  return { enrolments, ageDays }
}

export const stageMinAge = (stage: Stage): number => MIN_AGE[stage] ?? 0
