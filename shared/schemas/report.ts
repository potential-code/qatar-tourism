import { z } from 'zod'
import {
  ENROLMENT_STATUSES,
  ORGANISATION_TYPES,
  PROGRAMME_CODES,
  SENIORITY_LEVELS,
} from '../constants/enums'
import { isoInstant } from './common'

/** Top filters on the admin Dashboard and Reports (brief §12). */
export const reportFilters = z.object({
  programme: z.enum(PROGRAMME_CODES).optional(),
  pathId: z.uuid().optional(),
  organisationType: z.enum(ORGANISATION_TYPES).optional(),
  organisationId: z.uuid().optional(),
  seniority: z.enum(SENIORITY_LEVELS).optional(),
  status: z.enum(ENROLMENT_STATUSES).optional(),
  /** What the date range refers to (brief §12: labels must say which). */
  dateField: z.enum(['registration', 'activity', 'completion']).default('registration'),
  from: isoInstant.optional(),
  to: isoInstant.optional(),
})
export type ReportFilters = z.infer<typeof reportFilters>

export const exportRequest = z.object({
  report: z.string().min(2).max(60),
  filters: reportFilters.optional(),
  format: z.enum(['csv']).default('csv'),
})
