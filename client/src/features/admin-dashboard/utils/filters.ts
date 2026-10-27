import {
  ENROLMENT_STATUSES,
  ORGANISATION_TYPES,
  PROGRAMME_CODES,
  SENIORITY_LEVELS,
} from '@shared/constants'
import {
  DATE_FIELD_LABELS,
  ENROLMENT_STATUS_LABELS,
  ORGANISATION_TYPE_LABELS,
  PROGRAMME_LABELS,
  SENIORITY_LABELS,
} from '@shared/schemas/admin-labels'
import { z } from 'zod'

/**
 * The brief §12 top filters as URL search params, shared by the Dashboard and every report so a
 * KPI card can open "its filtered report" with the same cohort. Bad values fall back to unset
 * instead of breaking the page.
 */
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)

export const filterSearchSchema = z.object({
  programme: z.enum(PROGRAMME_CODES).optional().catch(undefined),
  pathId: z.uuid().optional().catch(undefined),
  organisationType: z.enum(ORGANISATION_TYPES).optional().catch(undefined),
  organisationId: z.uuid().optional().catch(undefined),
  seniority: z.enum(SENIORITY_LEVELS).optional().catch(undefined),
  status: z.enum(ENROLMENT_STATUSES).optional().catch(undefined),
  dateField: z.enum(['registration', 'activity', 'completion']).optional().catch(undefined),
  from: day,
  to: day,
})
export type FilterSearch = z.infer<typeof filterSearchSchema>
export const FILTER_KEYS = Object.keys(filterSearchSchema.shape) as (keyof FilterSearch)[]

/** Qatar is UTC+3 all year: a Qatar calendar day starts at 21:00 UTC the day before. */
const qatarStart = (date: string) => new Date(`${date}T00:00:00+03:00`).toISOString()
const qatarEnd = (date: string) => new Date(`${date}T23:59:59.999+03:00`).toISOString()

/** Search params → API query strings (every value a string, unset keys omitted). */
export function toApiFilters(search: FilterSearch): Record<string, string> {
  const out: Record<string, string> = {}
  if (search.programme) out.programme = search.programme
  if (search.pathId) out.pathId = search.pathId
  if (search.organisationType) out.organisationType = search.organisationType
  if (search.organisationId) out.organisationId = search.organisationId
  if (search.seniority) out.seniority = search.seniority
  if (search.status) out.status = search.status
  if (search.from || search.to) out.dateField = search.dateField ?? 'registration'
  if (search.from) out.from = qatarStart(search.from)
  if (search.to) out.to = qatarEnd(search.to)
  return out
}

/** Only the filter keys of a wider search object, so they can be carried to another page. */
export function pickFilters(search: Partial<FilterSearch>): FilterSearch {
  const out: FilterSearch = {}
  for (const key of FILTER_KEYS) {
    const value = search[key]
    if (value !== undefined) (out as Record<string, unknown>)[key] = value
  }
  return out
}

export type FilterLookups = {
  organisations: { id: string; name: string }[]
  paths: { id: string; name: string }[]
}

export type FilterChip = { key: keyof FilterSearch | 'date'; label: string; value: string }

const formatDay = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00Z`),
  )

/** Human-readable chips for the active-filter display (brief §12 "Display active filters"). */
export function filterChips(search: FilterSearch, lookups?: FilterLookups): FilterChip[] {
  const chips: FilterChip[] = []
  if (search.programme)
    chips.push({ key: 'programme', label: 'Programme', value: PROGRAMME_LABELS[search.programme] })
  if (search.pathId)
    chips.push({
      key: 'pathId',
      label: 'Path',
      value: lookups?.paths.find((p) => p.id === search.pathId)?.name ?? 'Selected path',
    })
  if (search.organisationType)
    chips.push({
      key: 'organisationType',
      label: 'Organisation type',
      value: ORGANISATION_TYPE_LABELS[search.organisationType],
    })
  if (search.organisationId)
    chips.push({
      key: 'organisationId',
      label: 'Organisation',
      value:
        lookups?.organisations.find((o) => o.id === search.organisationId)?.name ??
        'Selected organisation',
    })
  if (search.seniority)
    chips.push({ key: 'seniority', label: 'Seniority', value: SENIORITY_LABELS[search.seniority] })
  if (search.status)
    chips.push({
      key: 'status',
      label: 'Learner status',
      value: ENROLMENT_STATUS_LABELS[search.status],
    })
  if (search.from || search.to) {
    const basis = DATE_FIELD_LABELS[search.dateField ?? 'registration']
    const range =
      search.from && search.to
        ? `${formatDay(search.from)} to ${formatDay(search.to)}`
        : search.from
          ? `From ${formatDay(search.from)}`
          : `Up to ${formatDay(search.to as string)}`
    chips.push({ key: 'date', label: basis, value: range })
  }
  return chips
}
