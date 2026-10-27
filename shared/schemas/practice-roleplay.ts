import { z } from 'zod'
import { ROLEPLAY_MODES } from '../constants/enums'

/**
 * Simulated AI practice (brief §9). The browser sends only the learner's own replies; the
 * server replays the scripted visitor from them, so visitor lines and scores cannot be forged.
 */

const learnerReply = z.string().trim().min(1, 'Write a reply first').max(1000)

export const practiceTurnInput = z.object({
  scenarioKey: z.string().min(1).max(60),
  learnerTurns: z.array(learnerReply).min(1).max(6),
})
export type PracticeTurnInput = z.infer<typeof practiceTurnInput>

export const practiceAttemptInput = z.object({
  enrolmentId: z.uuid(),
  scenarioKey: z.string().min(1).max(60),
  mode: z.enum(ROLEPLAY_MODES),
  learnerTurns: z.array(learnerReply).min(4).max(6),
  usedRecordedDemo: z.boolean().default(false),
})
export type PracticeAttemptInput = z.infer<typeof practiceAttemptInput>

export const practiceAttemptsQuery = z.object({
  scenarioKey: z.string().min(1).max(60).optional(),
})
