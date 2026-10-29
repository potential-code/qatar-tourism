import type { ProgrammeCode } from '@shared/constants'
import { ROLEPLAY_SCENARIOS, SIMULATED_AI_LABEL } from '@shared/content/scenarios'
import {
  practiceAttemptInput,
  practiceAttemptsQuery,
  practiceTurnInput,
} from '@shared/schemas/practice-roleplay'
import { z } from 'zod'
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
import { recomputeEnrolment } from './progress.service'
import { findScenario, replay } from './roleplay/engine/conversation'
import { scoreConversation } from './roleplay/engine/scoring'
import { DEMONSTRATION_REPLIES } from './roleplay/engine/script'
import { attemptsOf, practiceEnrolments, summarise, toAttemptView } from './roleplay/views'

/**
 * Simulated AI practice (brief §9), formerly server/modules/roleplay. Learner only, on the
 * learner's own enrolments (roleplay.policy: PRACTICE_ROLES = ['learner']). The visitor is
 * scripted and replayed from the learner's replies, and scoring is deterministic, so visitor
 * lines and scores are never taken from the caller.
 */

const scenarioParam = z.object({ key: z.string().min(1).max(60) })

function scenarioOrThrow(key: string) {
  const scenario = findScenario(key)
  if (!scenario) throw ApiError.notFound('Scenario not found')
  return scenario
}

/** Scenario picker: the four scenarios with this learner's history, and their enrolments. */
export async function getOverview() {
  await delay()
  const viewer = requireRole('learner')
  const attempts = attemptsOf(viewer.id)
  return out({
    label: SIMULATED_AI_LABEL,
    enrolments: practiceEnrolments(viewer.id),
    summary: summarise(attempts),
    scenarios: ROLEPLAY_SCENARIOS.map((s) => ({
      key: s.key,
      title: s.title,
      visitorOpening: s.visitorOpening,
      learnerObjective: s.learnerObjective,
      competency: s.competency,
      difficulty: s.difficulty,
      estimatedMinutes: s.estimatedMinutes,
      ...summarise(attempts.filter((r) => r.attempt.scenarioKey === s.key)),
    })),
  })
}

export async function listAttempts(scenarioKey?: string) {
  await delay()
  const viewer = requireRole('learner')
  const query = parseInput(practiceAttemptsQuery, scenarioKey ? { scenarioKey } : {}, 'query')
  const rows = attemptsOf(viewer.id, query.scenarioKey)
  return out({
    summary: summarise(rows),
    items: rows.map((r) => toAttemptView(r.attempt, r.programmeCode)),
  })
}

/** One attempt, only for its owner: anything else is "not found", so ids cannot be probed. */
export async function getAttempt(attemptId: string) {
  await delay()
  const viewer = requireRole('learner')
  const row = attemptsOf(viewer.id).find((r) => r.attempt.id === attemptId)
  if (!row) throw ApiError.notFound('Practice attempt not found')
  return out(toAttemptView(row.attempt, row.programmeCode))
}

/** The scripted visitor's reply to the conversation so far. */
export async function nextTurn(input: unknown) {
  await delay()
  requireRole('learner')
  const body = parseInput(practiceTurnInput, input)
  const { transcript, done } = replay(scenarioOrThrow(body.scenarioKey), body.learnerTurns)
  const visitor = transcript[transcript.length - 1]
  return out({ reply: visitor?.speaker === 'visitor' ? visitor.text : '', done, transcript })
}

/** A complete model conversation for the labelled prerecorded demonstration. */
export async function getDemonstration(scenarioKey: string) {
  await delay()
  requireRole('learner')
  const { key } = parseInput(scenarioParam, { key: scenarioKey }, 'param')
  const scenario = scenarioOrThrow(key)
  const replies = DEMONSTRATION_REPLIES[scenario.key] ?? []
  return out({
    transcript: replay(scenario, replies).transcript,
    label: 'Prerecorded demonstration',
  })
}

/**
 * Saves a finished attempt. The transcript is rebuilt from the learner's replies and scored
 * here; the caller never supplies visitor lines or scores. Progress is re-derived after the
 * write (brief §5: one completed role-play counts towards completion).
 */
export async function createAttempt(input: unknown) {
  await delay()
  const viewer = requireRole('learner')
  const body = parseInput(practiceAttemptInput, input)
  const scenario = scenarioOrThrow(body.scenarioKey)
  const enrolment = db.enrolments.find(
    (e) => e.id === body.enrolmentId && e.learnerId === viewer.id,
  )
  if (!enrolment) throw ApiError.notFound('Enrolment not found')
  const programmeCode = db.programmes.find((p) => p.id === enrolment.programmeId)?.code
  if (!programmeCode) throw ApiError.notFound('Enrolment not found')
  if (programmeCode === 'C') {
    throw ApiError.badRequest('AI practice is part of Program A and Program B')
  }

  const conversation = replay(scenario, body.learnerTurns)
  if (!conversation.done) {
    throw new ApiError(
      400,
      'CONVERSATION_INCOMPLETE',
      'Finish the conversation before you submit it for feedback.',
    )
  }
  const result = scoreConversation(scenario, body.learnerTurns)
  const completedAt = nowIso()

  const attempt = insertRow('rolePlayAttempts', {
    enrolmentId: enrolment.id,
    learnerId: viewer.id,
    scenarioKey: scenario.key,
    mode: body.mode,
    transcript: conversation.transcript,
    empathyScore: result.scores.empathy_professionalism,
    discoveryScore: result.scores.discovery_questions,
    clarityScore: result.scores.clarity,
    accuracyScore: result.scores.accuracy_boundaries,
    solutionScore: result.scores.solution_followthrough,
    totalScore: result.total,
    totalPercent: result.percent,
    feedback: {
      criteria: result.criteria,
      strength: result.strength,
      improve: result.improve,
      retry: result.retry,
    },
    usedRecordedDemo: body.usedRecordedDemo,
    completedAt,
    createdAt: completedAt,
    updatedAt: completedAt,
  })
  updateRow(enrolment, { lastActivityAt: completedAt })
  recomputeEnrolment(viewer.id, programmeCode as ProgrammeCode)
  commit()
  return out(toAttemptView(attempt, programmeCode))
}

export type PracticeOverview = Awaited<ReturnType<typeof getOverview>>
export type PracticeAttemptView = Awaited<ReturnType<typeof getAttempt>>
