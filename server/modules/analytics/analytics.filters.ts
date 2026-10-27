import type { ReportFilters } from '@shared/schemas'
import type { EnrolmentFact, Facts } from './analytics.types'

/** Filters as the metric layer reads them; every key optional (the zod default fills dateField). */
export type CohortFilters = Partial<ReportFilters>

/** Which instant the date range tests, by the brief §12 label the filter shows. */
function dateOf(fact: EnrolmentFact, field: CohortFilters['dateField']): Date | null {
  if (field === 'activity') return fact.lastActivityAt
  if (field === 'completion') return fact.completedAt
  return fact.registeredAt
}

/**
 * The cohort: enrolments matching every active filter. Programme, path, organisation type,
 * organisation, seniority and learner (enrolment) status are exact matches; the date range
 * applies to registration, activity or completion as `dateField` says. An enrolment without
 * that date (e.g. not completed) is outside a completion-date range.
 */
export function cohort(facts: Facts, filters: CohortFilters): EnrolmentFact[] {
  const from = filters.from ? new Date(filters.from) : null
  const to = filters.to ? new Date(filters.to) : null
  return facts.enrolments.filter((fact) => {
    if (filters.programme && fact.programme !== filters.programme) return false
    if (filters.pathId && fact.pathId !== filters.pathId) return false
    if (filters.organisationType && fact.organisationType !== filters.organisationType) return false
    if (filters.organisationId && fact.organisationId !== filters.organisationId) return false
    if (filters.seniority && fact.seniority !== filters.seniority) return false
    if (filters.status && fact.status !== filters.status) return false
    if (from || to) {
      const at = dateOf(fact, filters.dateField)
      if (!at) return false
      if (from && at < from) return false
      if (to && at > to) return false
    }
    return true
  })
}

/** `learnerId:programme` keys of a cohort: the attendance metrics join on these. */
export function cohortKeys(rows: readonly EnrolmentFact[]): Set<string> {
  return new Set(rows.map((row) => `${row.learnerId}:${row.programme}`))
}

/** True when any filter other than the date basis is set. */
export function hasActiveFilters(filters: CohortFilters): boolean {
  return Boolean(
    filters.programme ||
      filters.pathId ||
      filters.organisationType ||
      filters.organisationId ||
      filters.seniority ||
      filters.status ||
      filters.from ||
      filters.to,
  )
}
