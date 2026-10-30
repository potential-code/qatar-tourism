import { z } from 'zod'
import { COMPETENCIES, PROGRAMME_CODES } from '../constants/enums'

/**
 * Request DTOs for the learning engine (brief §5–9): progress events, assessments, SCORM,
 * AI path and certificates. Every endpoint derives the learner from the session, never from
 * the body, so none of these carry a learner id.
 */

export const programmeParam = z.object({ programme: z.enum(PROGRAMME_CODES) })

export const courseCodeParam = z.object({ code: z.string().regex(/^C0[1-9]$/) })

export const programmeQuery = z.object({ programme: z.enum(PROGRAMME_CODES) })

/** C01 / C03 video: the furthest point watched, in percent. Complete at 90 (brief §7). */
export const videoProgressBody = z.object({
  programme: z.enum(PROGRAMME_CODES),
  courseCode: z.enum(['C01', 'C03']),
  watchedPercent: z.number().min(0).max(100),
  positionSeconds: z.number().min(0).max(36_000).optional(),
})
export type VideoProgressBody = z.infer<typeof videoProgressBody>

/** C02 branching preview: the choices made at the first decision, in order, then the confirm step. */
export const branchingBody = z.object({
  programme: z.enum(PROGRAMME_CODES),
  choices: z
    .array(z.enum(['A', 'B', 'C']))
    .min(1)
    .max(3),
  optionChosen: z.enum(['museum', 'dhow']),
  confirmChoice: z.enum(['confirm', 'leave']),
})
export type BranchingBody = z.infer<typeof branchingBody>

/** C03 formative check: one answer at a time; the server grades it. */
export const formativeAnswerBody = z.object({
  programme: z.enum(PROGRAMME_CODES),
  questionId: z.enum(['c03-q1', 'c03-q2', 'c03-q3']),
  option: z.enum(['A', 'B', 'C']),
})
export type FormativeAnswerBody = z.infer<typeof formativeAnswerBody>

/** C05 checklist and draft plan (Program A completes it; Program B completes on approval). */
export const resourceBody = z.object({
  programme: z.enum(PROGRAMME_CODES),
  checklist: z.array(z.string().max(40)).max(10),
  draft: z.string().max(4000).optional(),
  markComplete: z.boolean().default(false),
})
export type ResourceBody = z.infer<typeof resourceBody>

/** C07 preview viewed. */
export const previewViewedBody = z.object({ programme: z.enum(PROGRAMME_CODES) })

export const assessmentKindParam = z.object({
  programme: z.enum(PROGRAMME_CODES),
  kind: z.enum(['pre', 'post', 'formative']),
})

export const assessmentSaveBody = z.object({
  competency: z.enum(COMPETENCIES),
  option: z.enum(['A', 'B', 'C']),
})
export type AssessmentSaveBody = z.infer<typeof assessmentSaveBody>

/** SCORM 2004 runtime commit from the sample package (brief §8). */
export const scormCommitBody = z.object({
  programme: z.enum(PROGRAMME_CODES),
  cmiCompletionStatus: z.enum(['completed', 'incomplete', 'not attempted', 'unknown']),
  cmiSuccessStatus: z.enum(['passed', 'failed', 'unknown']).optional(),
  scoreRaw: z.number().min(0).max(100).nullable().optional(),
  sessionTimeSeconds: z.number().int().min(0).max(86_400).optional(),
  suspendData: z.string().max(64_000).optional(),
  location: z.string().max(1000).optional(),
  /** One id per launch, so session time adds up across launches without double counting. */
  launchId: z.string().regex(/^[a-zA-Z0-9-]{8,40}$/),
  /** Content Library units: which language variant (package) this commit belongs to. */
  packageId: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/)
    .optional(),
})
export type ScormCommitBody = z.infer<typeof scormCommitBody>

export const scormRestartBody = z.object({ programme: z.enum(PROGRAMME_CODES) })

export const certificateCodeParam = z.object({ code: z.string().regex(/^QTA-DEMO-[A-Z]-\d{6}$/) })
