import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { type FilterSearch, pickFilters } from '../utils/filters'

/** Opens a report carrying the current cohort filters plus any drill-down params. */
export function useOpenReport(filters: FilterSearch) {
  const navigate = useNavigate()
  return useCallback(
    (report: string, extra: Record<string, string | undefined> = {}) =>
      navigate({
        to: '/admin/reports/$report',
        params: { report },
        search: { ...pickFilters(filters), ...extra },
      } as never),
    [navigate, filters],
  )
}
