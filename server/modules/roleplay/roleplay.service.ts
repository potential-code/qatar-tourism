import { db } from '@server/db/connection'
import {
  enrolments,
  programmes,
  type RolePlayAttemptRow,
  rolePlayAttempts,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import type { PracticeAttemptInput, PracticeTurnInput } from '@shared/schemas/practice-roleplay'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { findScenario, replay } from './engine/conversation'
import { scoreConversation } from './engine/scoring'
import { DEMONSTRATION_REPLIES } from './engine/script'

/** Practice belongs to the active demo programmes; C is an illustrative overview only. */
const PRACTICE_PROGRAMMES = ['A', 'B'] as const

function scenarioOrThrow(key: string) {
  const scenario = findScenario(key)
  if (!scenario) throw HttpError.notFound('Scenario not found')
  return scenario
}

export async function practiceEnrolments(learnerId: string) {
  return db
    .select({
      id: enrolments.id,
      programmeCode: programmes.code,
      programmeTitle: programmes.title,
      status: enrolments.status,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(
      and(eq(enrolments.learnerId, learnerId), inArray(programmes.code, [...PRACTICE_PROGRAMMES])),
    )
    .orderBy(programmes.code)
}

export async function listAttempts(learnerId: string, scenarioKey?: string) {
  return db
    .select({ attempt: rolePlayAttempts, programmeCode: programmes.code })
    .from(rolePlayAttempts)
    .innerJoin(enrolments, eq(enrolments.id, rolePlayAttempts.enrolmentId))
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(
      and(
        eq(rolePlayAttempts.learnerId, learnerId),
        scenarioKey ? eq(rolePlayAttempts.scenarioKey, scenarioKey) : undefined,
      ),
    )
    .orderBy(desc(rolePlayAttempts.completedAt), desc(rolePlayAttempts.id))
}

/** One attempt, only for its owner: anything else is "not found", so ids cannot be probed. */
export async function getAttempt(learnerId: string, attemptId: string) {
  const [row] = await db
    .select({ attempt: rolePlayAttempts, programmeCode: programmes.code })
    .from(rolePlayAttempts)
    .innerJoin(enrolments, eq(enrolments.id, rolePlayAttempts.enrolmentId))
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(and(eq(rolePlayAttempts.id, attemptId), eq(rolePlayAttempts.learnerId, learnerId)))
    .limit(1)
  if (!row) throw HttpError.notFound('Practice attempt not found')
  return row
}

/** The scripted visitor's reply to the conversation so far. */
export function nextTurn(input: PracticeTurnInput) {
  const scenario = scenarioOrThrow(input.scenarioKey)
  return replay(scenario, input.learnerTurns)
}

/** A complete model conversation for the labelled prerecorded demonstration. */
export function demonstration(scenarioKey: string) {
  const scenario = scenarioOrThrow(scenarioKey)
  const replies = DEMONSTRATION_REPLIES[scenario.key] ?? []
  return replay(scenario, replies).transcript
}

/**
 * Saves a finished attempt. The transcript is rebuilt from the learner's replies and scored on
 * the server; the browser never supplies visitor lines or scores. Progress is re-derived in the
 * same transaction (brief §5: one completed role-play counts towards completion).
 */
export async function createAttempt(learnerId: string, input: PracticeAttemptInput) {
  const scenario = scenarioOrThrow(input.scenarioKey)
  const [enrolment] = await db
    .select({ id: enrolments.id, programmeCode: programmes.code })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(and(eq(enrolments.id, input.enrolmentId), eq(enrolments.learnerId, learnerId)))
    .limit(1)
  if (!enrolment) throw HttpError.notFound('Enrolment not found')
  if (enrolment.programmeCode === 'C') {
    throw HttpError.badRequest('AI practice is part of Program A and Program B')
  }

  const conversation = replay(scenario, input.learnerTurns)
  if (!conversation.done) {
    throw new HttpError(
      400,
      'CONVERSATION_INCOMPLETE',
      'Finish the conversation before you submit it for feedback.',
    )
  }
  const result = scoreConversation(scenario, input.learnerTurns)
  const completedAt = now()
  const programmeCode = enrolment.programmeCode

  const attempt = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(rolePlayAttempts)
      .values({
        enrolmentId: enrolment.id,
        learnerId,
        scenarioKey: scenario.key,
        mode: input.mode,
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
        usedRecordedDemo: input.usedRecordedDemo,
        completedAt,
        createdAt: completedAt,
        updatedAt: completedAt,
      })
      .returning()
    await tx
      .update(enrolments)
      .set({ lastActivityAt: completedAt })
      .where(eq(enrolments.id, enrolment.id))
    await recomputeEnrolment(learnerId, programmeCode, tx)
    return row as RolePlayAttemptRow
  })

  return { attempt, programmeCode }
}

export const scenarios = ROLEPLAY_SCENARIOS
