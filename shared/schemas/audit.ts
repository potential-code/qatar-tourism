import { z } from 'zod'

export const auditEventView = z.object({
  id: z.uuid(),
  actorId: z.string().nullable(),
  actorRole: z.string(),
  actorLabel: z.string().nullable(),
  action: z.string(),
  objectType: z.string(),
  objectId: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  reason: z.string().nullable(),
  outcome: z.enum(['allowed', 'denied']),
  createdAt: z.string(),
})
export type AuditEventView = z.infer<typeof auditEventView>

export const auditQuery = z.object({
  action: z.string().optional(),
  objectType: z.string().optional(),
  actorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})
