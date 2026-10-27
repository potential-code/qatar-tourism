import { z } from 'zod'

export const adminCourseUpdateInput = z
  .object({
    summary: z.string().trim().min(10, 'Write at least 10 characters').max(800),
    completionText: z.string().trim().min(5).max(400),
    transcript: z.string().trim().max(20_000).nullable(),
  })
  .partial()
export type AdminCourseUpdateInput = z.infer<typeof adminCourseUpdateInput>

export const courseIdParam = z.object({ courseId: z.uuid() })
export const sessionIdParam = z.object({ sessionId: z.uuid() })
export const assessmentIdParam = z.object({ assessmentId: z.uuid() })

export const adminAssessmentUpdateInput = z.object({
  passPercent: z.number().int().min(0).max(100).nullable(),
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters').max(300),
})
