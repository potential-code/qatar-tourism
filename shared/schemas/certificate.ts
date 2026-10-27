import { z } from 'zod'

export const certificateView = z.object({
  code: z.string(),
  learnerName: z.string(),
  programmeTitle: z.string(),
  status: z.enum(['issued', 'revoked']),
  issuedAt: z.string(),
  revokedAt: z.string().nullable(),
})

export const certificateRevokeInput = z.object({ reason: z.string().trim().min(5).max(300) })
export const certificateReissueInput = z.object({ reason: z.string().trim().min(5).max(300) })
export const certificateVerifyParam = z.object({ code: z.string().regex(/^QTA-DEMO-[A-Z]-\d{6}$/) })
