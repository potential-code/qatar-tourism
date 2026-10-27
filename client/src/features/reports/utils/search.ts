import { REPORT_VIEWS } from '@shared/schemas/admin-reports'
import { z } from 'zod'
import { filterSearchSchema } from '@/features/admin-dashboard/utils/filters'

/** Report URL state: the shared top filters plus search, sort, status, view and paging. */
export const reportSearchSchema = filterSearchSchema.extend({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce
    .number()
    .refine((n) => [25, 50, 100].includes(n))
    .optional()
    .catch(undefined),
  search: z.string().max(100).optional().catch(undefined),
  sort: z.string().max(50).optional().catch(undefined),
  direction: z.enum(['asc', 'desc']).optional().catch(undefined),
  rowStatus: z.string().max(40).optional().catch(undefined),
  view: z.enum(REPORT_VIEWS).optional().catch(undefined),
})
export type ReportSearch = z.infer<typeof reportSearchSchema>

export const VIEW_LABELS: Record<(typeof REPORT_VIEWS)[number], string> = {
  active: 'Active learners (last 30 days)',
  inactive: 'Inactive 14 days or more',
  upcoming: 'Upcoming sessions',
  pending: 'Awaiting a trainer mark',
}
