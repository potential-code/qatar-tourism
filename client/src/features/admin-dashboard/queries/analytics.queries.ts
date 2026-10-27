import { queryOptions } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'
import { type FilterSearch, toApiFilters } from '../utils/filters'

export type Overview = InferResponseType<typeof api.analytics.overview.$get, 200>
export type FilterOptions = InferResponseType<(typeof api.analytics)['filter-options']['$get'], 200>

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (filters: FilterSearch) => ['analytics', 'overview', toApiFilters(filters)] as const,
  options: ['analytics', 'filter-options'] as const,
  meta: ['demo', 'meta'] as const,
}

export const overviewQuery = (filters: FilterSearch) =>
  queryOptions({
    queryKey: analyticsKeys.overview(filters),
    queryFn: () => unwrap(api.analytics.overview.$get({ query: toApiFilters(filters) })),
    placeholderData: (previous) => previous,
  })

export const filterOptionsQuery = () =>
  queryOptions({
    queryKey: analyticsKeys.options,
    queryFn: () => unwrap(api.analytics['filter-options'].$get()),
    staleTime: 5 * 60_000,
  })

export const demoMetaQuery = () =>
  queryOptions({
    queryKey: analyticsKeys.meta,
    queryFn: () => unwrap(api.demo.meta.$get()),
  })
