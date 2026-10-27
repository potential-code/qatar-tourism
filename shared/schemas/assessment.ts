import { z } from 'zod'
import { COMPETENCIES } from '../constants/enums'

export const assessmentAnswerInput = z.object({
  competency: z.enum(COMPETENCIES),
  selectedOption: z.enum(['A', 'B', 'C']),
})

export const assessmentSubmitInput = z.object({
  enrolmentId: z.uuid(),
  kind: z.enum(['pre', 'post', 'formative']),
  answers: z.array(assessmentAnswerInput).length(5),
})
export type AssessmentSubmitInput = z.infer<typeof assessmentSubmitInput>

export const assessmentResultView = z.object({
  attemptId: z.uuid(),
  kind: z.enum(['pre', 'post', 'formative']),
  version: z.string(),
  score: z.number(),
  competencyScores: z.record(z.string(), z.number()),
  submittedAt: z.string(),
})

/** Improvement is only computed from matched pre/post attempts (brief §8). */
export const improvementView = z.object({
  pre: z.number(),
  post: z.number(),
  gainPoints: z.number(),
})
