import { z } from 'zod'
import { REVIEW_STATUSES } from '../constants/enums'
import { UPLOAD_LIMITS } from '../constants/thresholds'

const allowedMime: string[] = [
  ...UPLOAD_LIMITS.document.mimeTypes,
  ...UPLOAD_LIMITS.video.mimeTypes,
]

/** File metadata the API validates before accepting an upload (brief §6). */
export const uploadMetaInput = z
  .object({
    fileName: z.string().min(1).max(200),
    mimeType: z.string().refine((m) => allowedMime.includes(m), 'Upload a PDF, DOCX or MP4 file'),
    sizeBytes: z.number().int().positive(),
  })
  .superRefine((file, ctx) => {
    const limit = file.mimeType === 'video/mp4' ? UPLOAD_LIMITS.video : UPLOAD_LIMITS.document
    if (file.sizeBytes > limit.maxBytes) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeBytes'],
        message: `File is too large. The limit is ${limit.maxBytes / (1024 * 1024)} MB.`,
      })
    }
  })

export const submissionInput = z.object({
  assignmentId: z.uuid(),
  enrolmentId: z.uuid(),
  responseText: z.string().trim().max(6000).optional(),
  upload: uploadMetaInput.optional(),
})
export type SubmissionInput = z.infer<typeof submissionInput>

export const reviewInput = z.object({
  submissionId: z.uuid(),
  rubricScore: z.number().int().min(0).max(100),
  rubricBreakdown: z.record(z.string(), z.number()).optional(),
  feedback: z.string().trim().min(5).max(2000),
  status: z.enum(REVIEW_STATUSES),
})
export type ReviewInput = z.infer<typeof reviewInput>
