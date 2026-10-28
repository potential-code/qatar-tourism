import { z } from 'zod'
import { DEFAULT_PAGE_SIZE } from '../constants/thresholds'

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListQuery = z.infer<typeof listQuery>

/** Report pagination (brief §13): 25 by default, 50 and 100 on request. */
export const reportListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [25, 50, 100].includes(n))
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(50).optional(),
  direction: z.enum(['asc', 'desc']).default('asc'),
})

export type ReportListQuery = z.infer<typeof reportListQuery>

export const idParam = z.object({ id: z.uuid() })

export const FICTIONAL_EMAIL_DOMAIN = 'example.com'
export const FICTIONAL_EMAIL_MESSAGE = `Use a fictional address ending in ${FICTIONAL_EMAIL_DOMAIN}`

/**
 * Fictional accounts only (brief §1, §4, §15): every address, seeded, created by an admin or
 * registered by a visitor, ends in example.com, so no real person's email enters the demo.
 */
export const fictionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .refine((value) => value.endsWith(`@${FICTIONAL_EMAIL_DOMAIN}`), FICTIONAL_EMAIL_MESSAGE)

/** Stable human code for a learner, e.g. L0001. */
export const learnerCode = z.string().regex(/^L\d{4}$/)

/** ISO 8601 instant in UTC, as sent over the wire. */
export const isoInstant = z.iso.datetime()

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  })
