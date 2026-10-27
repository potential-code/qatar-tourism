import { z } from 'zod'
import { DEFAULT_PAGE_SIZE } from '../constants/thresholds'
import { reportFilters } from './report'

/** The ten Reports children of the admin nav (brief §12), plus the dashboard attention table. */
export const REPORT_KEYS = [
  'program-a',
  'program-b',
  'program-c',
  'learners',
  'trainers',
  'sessions',
  'assessments',
  'assignments',
  'certification',
  'notifications',
  'attention',
] as const
export type ReportKey = (typeof REPORT_KEYS)[number]

/** Drill-down views a KPI card can open (brief §12 "Each card opens its filtered report"). */
export const REPORT_VIEWS = ['active', 'inactive', 'upcoming', 'pending'] as const
export type ReportView = (typeof REPORT_VIEWS)[number]

const listParams = z.object({
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(50).optional(),
  direction: z.enum(['asc', 'desc']).default('asc'),
  /** Report-specific status filter (e.g. a session status), validated against the report. */
  rowStatus: z.string().trim().max(40).optional(),
  view: z.enum(REPORT_VIEWS).optional(),
})

/** Query for one page of a report: the top filters, then search, sort, status and paging. */
export const reportPageQuery = reportFilters.extend(listParams.shape).extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [25, 50, 100].includes(n), 'Page size must be 25, 50 or 100')
    .default(DEFAULT_PAGE_SIZE),
})
export type ReportPageQuery = z.infer<typeof reportPageQuery>

/** Export takes the same filters and sort, never paging: the file holds every matching row. */
export const reportExportQuery = reportFilters.extend(listParams.shape)
export type ReportExportQuery = z.infer<typeof reportExportQuery>

export const reportParam = z.object({ report: z.enum(REPORT_KEYS) })
