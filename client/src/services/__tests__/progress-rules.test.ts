import { describe, expect, test } from 'bun:test'
import { THRESHOLDS } from '@shared/constants'
import {
  type AttemptEvidence,
  type Evidence,
  evaluate,
  level1Complete,
  type PathItemInput,
  type UnitEvidence,
} from '../progress/rules'

const item = (
  position: number,
  kind: PathItemInput['kind'],
  extra: Partial<PathItemInput> = {},
): PathItemInput => ({
  id: `item-${position}`,
  position,
  kind,
  courseCode: null,
  scenarioKey: null,
  title: kind,
  required: true,
  level: 1,
  stage: 'Stage',
  durationMinutes: null,
  ...extra,
})

const B_PATH = [
  item(1, 'assessment_pre'),
  item(2, 'course', { courseCode: 'C01', durationMinutes: 3 }),
  item(3, 'course', { courseCode: 'C02', durationMinutes: 8 }),
  item(4, 'course', { courseCode: 'C03', durationMinutes: 4 }),
  item(5, 'course', { courseCode: 'C05', durationMinutes: 10 }),
  item(6, 'ai_practice', { scenarioKey: 'changed-booking' }),
  item(7, 'assessment_post'),
]

const A_PATH = [
  item(1, 'assessment_pre'),
  item(2, 'course', { courseCode: 'C01' }),
  item(3, 'course', { courseCode: 'C03' }),
  item(4, 'course', { courseCode: 'C04' }),
  item(5, 'course', { courseCode: 'C02' }),
  item(6, 'assessment_formative'),
  item(7, 'ai_practice'),
  item(8, 'course', { courseCode: 'C05', level: 2 }),
  item(9, 'session', { courseCode: 'C06', level: 2 }),
  item(10, 'assignment', { level: 2 }),
  item(11, 'assessment_post', { level: 2 }),
]

const done = (): UnitEvidence => ({
  status: 'completed',
  percent: 100,
  scoreRaw: null,
  completedAt: new Date(),
})

const attempt = (kind: AttemptEvidence['kind'], score: number, attemptNo = 1): AttemptEvidence => ({
  kind,
  attemptNo,
  status: 'submitted',
  score,
  competencyScores: {},
  startedAt: new Date(),
  submittedAt: new Date(),
})

function evidence(programme: 'A' | 'B', overrides: Partial<Evidence> = {}): Evidence {
  return {
    programme,
    items: programme === 'A' ? A_PATH : B_PATH,
    units: new Map(),
    attempts: [],
    rolePlayCount: 0,
    session: { passed: false, booked: false, awaitingScore: false, bestFinalScore: null },
    submissions: [],
    ...overrides,
  }
}

const approved = (score: number) => ({
  version: 1,
  status: 'approved' as const,
  submittedAt: new Date(),
  review: { status: 'approved' as const, score, reviewedAt: new Date() },
})

describe('Program B rules (brief §5)', () => {
  const units = new Map(['C01', 'C02', 'C03'].map((c) => [c, done()]))

  test('nothing recorded is not started, and only the baseline is open', () => {
    const result = evaluate(evidence('B'))
    expect(result.status).toBe('not_started')
    expect(result.items[0]?.state).toBe('available')
    expect(result.items.slice(1).every((i) => i.state === 'locked')).toBe(true)
  })

  test('Maha mid-journey: practice is the next action', () => {
    const result = evaluate(evidence('B', { units, attempts: [attempt('pre', 40)] }))
    expect(result.status).toBe('in_progress')
    expect(result.nextItem?.kind).toBe('ai_practice')
    const practice = result.items.find((i) => i.kind === 'ai_practice')
    expect(practice?.state).toBe('available')
    // Post-assessment stays locked until the practice conversation is done.
    expect(result.items.find((i) => i.kind === 'assessment_post')?.state).toBe('locked')
  })

  test('a pending short response is awaiting review', () => {
    const result = evaluate(
      evidence('B', {
        units,
        attempts: [attempt('pre', 40)],
        rolePlayCount: 1,
        submissions: [{ version: 1, status: 'submitted', submittedAt: new Date(), review: null }],
      }),
    )
    expect(result.status).toBe('awaiting_review')
  })

  test('completes with units, one role-play, approval and any post score, and never certifies', () => {
    const result = evaluate(
      evidence('B', {
        units,
        attempts: [attempt('pre', 40), attempt('post', 60)],
        rolePlayCount: 1,
        submissions: [approved(75)],
      }),
    )
    expect(result.status).toBe('completed')
    expect(result.progressPercent).toBe(100)
    expect(result.certificateEligible).toBe(false)
  })

  test('without the role-play B is not complete', () => {
    const result = evaluate(
      evidence('B', {
        units,
        attempts: [attempt('pre', 40), attempt('post', 100)],
        submissions: [approved(90)],
      }),
    )
    expect(result.complete).toBe(false)
  })
})

describe('Program A rules (brief §6)', () => {
  const level1Units = new Map(['C01', 'C03', 'C04', 'C02'].map((c) => [c, done()]))

  test('Level 2 stays locked until the foundation quiz reaches the pass mark', () => {
    const below = evidence('A', {
      units: level1Units,
      attempts: [attempt('pre', 40), attempt('formative', THRESHOLDS.foundationQuizPass - 20)],
    })
    expect(level1Complete(below)).toBe(false)
    const result = evaluate(below)
    expect(result.items.find((i) => i.kind === 'session')?.state).toBe('locked')
    expect(result.currentStage).toBe('Level 1: Foundation learning')

    const passed = evidence('A', {
      units: level1Units,
      attempts: [attempt('pre', 40), attempt('formative', 60), attempt('formative', 80, 2)],
    })
    expect(level1Complete(passed)).toBe(true)
    expect(evaluate(passed).items.find((i) => i.kind === 'session')?.state).toBe('available')
  })

  test('a session score below 70 or an assignment below 70 never certifies', () => {
    const base = {
      units: new Map([...level1Units, ['C05', done()]]),
      attempts: [attempt('pre', 40), attempt('formative', 80), attempt('post', 100)],
      rolePlayCount: 1,
    }
    const lowSession = evaluate(
      evidence('A', {
        ...base,
        session: { passed: false, booked: false, awaitingScore: false, bestFinalScore: 65 },
        submissions: [approved(90)],
      }),
    )
    expect(lowSession.certificateEligible).toBe(false)

    const lowAssignment = evaluate(
      evidence('A', {
        ...base,
        session: { passed: true, booked: false, awaitingScore: false, bestFinalScore: 85 },
        submissions: [approved(65)],
      }),
    )
    expect(lowAssignment.certificateEligible).toBe(false)
  })

  test('final assessment below 80 keeps the enrolment open; at 80 it certifies', () => {
    const base = {
      units: new Map([...level1Units, ['C05', done()]]),
      rolePlayCount: 1,
      session: { passed: true, booked: false, awaitingScore: false, bestFinalScore: 85 },
      submissions: [approved(82)],
    }
    const below = evaluate(
      evidence('A', {
        ...base,
        attempts: [attempt('pre', 40), attempt('formative', 80), attempt('post', 60)],
      }),
    )
    expect(below.complete).toBe(false)
    expect(below.currentStage).toBe('Final assessment')

    const pass = evaluate(
      evidence('A', {
        ...base,
        attempts: [
          attempt('pre', 40),
          attempt('formative', 80),
          attempt('post', 60),
          attempt('post', 80, 2),
        ],
      }),
    )
    expect(pass.complete).toBe(true)
    expect(pass.certificateEligible).toBe(true)
    expect(pass.gates.every((g) => g.state === 'completed')).toBe(true)
  })
})
