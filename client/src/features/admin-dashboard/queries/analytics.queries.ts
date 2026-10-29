import { queryOptions } from '@tanstack/react-query'
import * as analyticsService from '@/services/analytics.service'
import * as demoService from '@/services/demo.service'
import { type FilterSearch, toApiFilters } from '../utils/filters'

export type { FilterOptions, Overview } from '@/services/analytics.service'

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (filters: FilterSearch) => ['analytics', 'overview', toApiFilters(filters)] as const,
  options: ['analytics', 'filter-options'] as const,
  meta: ['demo', 'meta'] as const,
}

export const overviewQuery = (filters: FilterSearch) =>
  queryOptions({
    queryKey: analyticsKeys.overview(filters),
    queryFn: () => analyticsService.getOverview(toApiFilters(filters)),
    placeholderData: (previous) => previous,
  })

export const filterOptionsQuery = () =>
  queryOptions({
    queryKey: analyticsKeys.options,
    queryFn: () => analyticsService.getFilterOptions(),
    staleTime: 5 * 60_000,
  })

export const demoMetaQuery = () =>
  queryOptions({
    queryKey: analyticsKeys.meta,
    queryFn: () => demoService.getDemoMeta(),
  })
