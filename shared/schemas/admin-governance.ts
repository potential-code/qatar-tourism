import { z } from 'zod'
import { ROLES } from '../roles'

export const adminAuditQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [25, 50, 100].includes(n), 'Page size must be 25, 50 or 100')
    .default(25),
  action: z.string().trim().max(80).optional(),
  objectType: z.string().trim().max(80).optional(),
  actorRole: z.enum([...ROLES, 'system']).optional(),
  outcome: z.enum(['allowed', 'denied']).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  search: z.string().trim().max(100).optional(),
})
export type AdminAuditQuery = z.infer<typeof adminAuditQuery>

export const adminAuditExportQuery = adminAuditQuery.omit({ page: true, pageSize: true })
export type AdminAuditExportQuery = z.infer<typeof adminAuditExportQuery>

export type IntegrationState = 'Demo' | 'Not connected' | 'Connected'
