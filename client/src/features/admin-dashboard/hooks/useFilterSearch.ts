import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { FILTER_KEYS, type FilterSearch, filterSearchSchema } from '../utils/filters'

/**
 * Reads and writes the brief §12 top filters in the URL, for whichever admin page is mounted.
 * Changing a filter resets paging (`page`) so a report never lands on an empty page.
 */
export function useFilterSearch() {
  const raw = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const filters = useMemo(() => filterSearchSchema.parse(raw), [raw])

  const setFilters = useCallback(
    (patch: Partial<FilterSearch>) =>
      navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...prev, ...patch, page: undefined }
          for (const key of Object.keys(patch)) if (next[key] === undefined) delete next[key]
          return next
        },
        replace: true,
      } as never),
    [navigate],
  )

  const resetFilters = useCallback(
    () =>
      navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...prev, page: undefined }
          for (const key of FILTER_KEYS) delete next[key]
          return next
        },
        replace: true,
      } as never),
    [navigate],
  )

  return { filters, setFilters, resetFilters }
}
