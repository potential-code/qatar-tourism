import { z } from 'zod'
import { ROLEPLAY_CRITERIA, ROLEPLAY_MODES } from '../constants/enums'

export const roleplayStartInput = z.object({
  enrolmentId: z.uuid(),
  scenarioKey: z.string(),
  mode: z.enum(ROLEPLAY_MODES),
})

export const roleplayTurnInput = z.object({
  attemptId: z.uuid().optional(),
  scenarioKey: z.string(),
  turn: z.string().trim().min(1).max(1000),
})

export const roleplaySubmitInput = z.object({
  enrolmentId: z.uuid(),
  scenarioKey: z.string(),
  mode: z.enum(ROLEPLAY_MODES),
  transcript: z
    .array(z.object({ speaker: z.enum(['visitor', 'learner']), text: z.string().max(1000) }))
    .min(2)
    .max(14),
  usedRecordedDemo: z.boolean().default(false),
})
export type RoleplaySubmitInput = z.infer<typeof roleplaySubmitInput>

export const criterionFeedbackView = z.object({
  key: z.enum(ROLEPLAY_CRITERIA),
  score: z.number().int().min(0).max(4),
  evidence: z.string(),
  suggestion: z.string(),
})
