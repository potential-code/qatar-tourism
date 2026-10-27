import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { type ReportSearch, reportSearchSchema } from '../utils/search'

/** URL-backed list state for a report: search, sort, status, view, page and page size. */
export function useReportSearch() {
  const raw = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const search = useMemo(() => reportSearchSchema.parse(raw), [raw])

  const update = useCallback(
    (patch: Partial<ReportSearch>, resetPage = true) =>
      navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...prev, ...patch }
          if (resetPage && !('page' in patch)) delete next.page
          for (const [key, value] of Object.entries(next))
            if (value === undefined || value === '') delete next[key]
          return next
        },
        replace: true,
      } as never),
    [navigate],
  )

  const toggleSort = useCallback(
    (key: string, current?: { key: string; direction: 'asc' | 'desc' }) =>
      update({
        sort: key,
        direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
      }),
    [update],
  )

  return { search, update, toggleSort }
}
