import { z } from 'zod'
import { UNIT_PROGRESS_STATUSES } from '../constants/enums'

/** SCORM 2004 runtime fields persisted per unit (brief §8). */
export const scormCommitInput = z.object({
  courseCode: z.string().regex(/^C\d{2}$/),
  cmiCompletionStatus: z.enum(['completed', 'incomplete', 'not attempted', 'unknown']),
  cmiSuccessStatus: z.enum(['passed', 'failed', 'unknown']).optional(),
  scoreRaw: z.number().min(0).max(100).optional(),
  sessionTimeSeconds: z.number().int().min(0).max(86_400).optional(),
  suspendData: z.string().max(64_000).optional(),
  location: z.string().max(1000).optional(),
})
export type ScormCommitInput = z.infer<typeof scormCommitInput>

export const unitProgressView = z.object({
  courseCode: z.string(),
  status: z.enum(UNIT_PROGRESS_STATUSES),
  percent: z.number(),
  scoreRaw: z.number().nullable(),
  completedAt: z.string().nullable(),
})

export const videoProgressInput = z.object({
  courseCode: z.string().regex(/^C\d{2}$/),
  watchedPercent: z.number().min(0).max(100),
})

export const enrolInput = z.object({ programme: z.enum(['A', 'B', 'C']) })
