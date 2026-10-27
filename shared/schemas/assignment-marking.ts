import { z } from 'zod'
import { ASSIGNMENT_RUBRIC } from '../constants/rubrics'
import { UPLOAD_LIMITS } from '../constants/thresholds'

/**
 * Assignment submission, upload and marking contracts (brief §5 step 6, §6, §10–11).
 * Imported directly by path: shared/schemas/index.ts is a frozen shared file.
 */

export type RubricItem = { key: string; label: string; max: number }

/** Program A practical assignment (brief §6): the four parts the brief asks for. */
export const PRACTICAL_RUBRIC: readonly RubricItem[] = ASSIGNMENT_RUBRIC

/** Program B short response (brief §7 C05): the three things the task asks for, plus tone. */
export const SHORT_RESPONSE_RUBRIC: readonly RubricItem[] = [
  { key: 'acknowledge', label: 'Acknowledges the change', max: 25 },
  { key: 'question', label: 'Asks one useful question', max: 25 },
  { key: 'next_step', label: 'Offers a clear next step', max: 25 },
  { key: 'tone', label: 'Tone and clarity', max: 25 },
]

export function rubricFor(assignmentCode: string): readonly RubricItem[] {
  return assignmentCode.startsWith('B-') ? SHORT_RESPONSE_RUBRIC : PRACTICAL_RUBRIC
}

// --- Uploads --------------------------------------------------------------------------------

export type UploadKind = 'document' | 'video'

/** Upload kind from the file's MIME type and extension; both must agree. */
export function uploadKindOf(fileName: string, mimeType: string): UploadKind | null {
  const lower = fileName.toLowerCase()
  for (const kind of ['document', 'video'] as const) {
    const limit = UPLOAD_LIMITS[kind]
    const mimeOk = (limit.mimeTypes as readonly string[]).includes(mimeType)
    const extOk = limit.extensions.some((ext) => lower.endsWith(ext))
    if (mimeOk && extOk) return kind
  }
  return null
}

const MB = 1024 * 1024

/** The validation message for a chosen file, or null when it is acceptable (brief §6). */
export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
  const kind = uploadKindOf(file.name, file.type)
  if (!kind) return 'Upload a PDF or DOCX document, or an MP4 video.'
  if (file.size === 0) return 'This file is empty. Choose another file.'
  const limit = UPLOAD_LIMITS[kind]
  if (file.size > limit.maxBytes) {
    return kind === 'video'
      ? `This video is ${(file.size / MB).toFixed(1)} MB. MP4 videos can be up to ${limit.maxBytes / MB} MB.`
      : `This document is ${(file.size / MB).toFixed(1)} MB. PDF and DOCX files can be up to ${limit.maxBytes / MB} MB.`
  }
  return null
}

export const uploadStartInput = z
  .object({
    assignmentId: z.uuid(),
    fileName: z.string().trim().min(1).max(200),
    mimeType: z.string().max(120),
    sizeBytes: z.number().int().nonnegative(),
  })
  .superRefine((file, ctx) => {
    const problem = uploadProblem({
      name: file.fileName,
      type: file.mimeType,
      size: file.sizeBytes,
    })
    if (problem) ctx.addIssue({ code: 'custom', path: ['fileName'], message: problem })
  })
export type UploadStartInput = z.infer<typeof uploadStartInput>

export const uploadChunkQuery = z.object({ offset: z.coerce.number().int().nonnegative() })

/** Chunk size the client sends: under the API's 1 MB request body limit. */
export const UPLOAD_CHUNK_BYTES = 768 * 1024

// --- Submissions ----------------------------------------------------------------------------

export const submitInput = z
  .object({
    enrolmentId: z.uuid(),
    responseText: z.string().trim().max(8000).optional(),
    uploadId: z.uuid().optional(),
  })
  .refine((v) => Boolean(v.responseText) || Boolean(v.uploadId), {
    message: 'Write your response or attach a file before submitting.',
    path: ['responseText'],
  })
export type SubmitInput = z.infer<typeof submitInput>

/** Words in a response, the way the editor counts them. */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// --- Marking --------------------------------------------------------------------------------

export const MARKING_DECISIONS = ['returned', 'approved'] as const
export type MarkingDecision = (typeof MARKING_DECISIONS)[number]

const breakdown = z.record(z.string().max(40), z.number().int().min(0).max(100))

export const markingDraftInput = z.object({
  breakdown,
  feedback: z.string().trim().max(2000).default(''),
  decision: z.enum(MARKING_DECISIONS).optional(),
})
export type MarkingDraftInput = z.infer<typeof markingDraftInput>

export const markingFinalInput = z.object({
  breakdown,
  feedback: z.string().trim().min(10, 'Write at least a sentence of feedback.').max(2000),
  decision: z.enum(MARKING_DECISIONS),
})
export type MarkingFinalInput = z.infer<typeof markingFinalInput>

/** Corrections after finalisation need a reason, which is audited (brief §10). */
export const markingCorrectionInput = markingFinalInput.extend({
  reason: z.string().trim().min(10, 'Give a reason of at least 10 characters.').max(500),
})
export type MarkingCorrectionInput = z.infer<typeof markingCorrectionInput>

export const MARKING_QUEUE_FILTERS = ['open', 'returned', 'approved', 'all'] as const

export const markingQueueQuery = z.object({
  status: z.enum(MARKING_QUEUE_FILTERS).default('open'),
  programme: z.enum(['A', 'B']).optional(),
  search: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})
export type MarkingQueueQuery = z.infer<typeof markingQueueQuery>

/** Sum of the rubric parts, each clamped to its maximum. */
export function rubricTotal(rubric: readonly RubricItem[], parts: Record<string, number>): number {
  return rubric.reduce(
    (sum, item) => sum + Math.min(item.max, Math.max(0, parts[item.key] ?? 0)),
    0,
  )
}
