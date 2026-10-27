import { z } from 'zod'
import { PROGRAMME_CODES, PROGRAMME_STATUSES } from '../constants/enums'

export const programmeView = z.object({
  id: z.uuid(),
  code: z.enum(PROGRAMME_CODES),
  title: z.string(),
  audience: z.string(),
  summary: z.string(),
  formatLabel: z.string(),
  durationLabel: z.string(),
  levels: z.number(),
  certificationEnabled: z.boolean(),
  isIllustrative: z.boolean(),
  status: z.enum(PROGRAMME_STATUSES),
})
export type ProgrammeView = z.infer<typeof programmeView>

/** Enforced server-side: Program B (and C) can never have certification on (brief §14). */
export const programmeUpdateInput = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  summary: z.string().trim().min(10).max(600).optional(),
  audience: z.string().trim().min(3).max(300).optional(),
  status: z.enum(PROGRAMME_STATUSES).optional(),
  certificationEnabled: z.boolean().optional(),
})
export type ProgrammeUpdateInput = z.infer<typeof programmeUpdateInput>
