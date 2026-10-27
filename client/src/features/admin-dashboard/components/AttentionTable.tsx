import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { ReportTable } from '@/features/reports/components/ReportTable'
import { RowDetailSheet } from '@/features/reports/components/RowDetailSheet'
import { useDebouncedValue } from '@/features/reports/hooks/useDebouncedValue'
import { type ReportRow, reportPageQuery } from '@/features/reports/queries/reports.queries'
import type { FilterSearch } from '../utils/filters'
import { FilterSelect } from './filters/FilterSelect'
import { PanelCard } from './PanelCard'

/**
 * Brief §12 "learners requiring attention": server-paged with search, sorting, a reason filter
 * and a drill-down panel. Its list state stays local so the dashboard URL holds filters only.
 */
export function AttentionTable({ filters }: { filters: FilterSearch }) {
  const [term, setTerm] = useState('')
  const search = useDebouncedValue(term)
  const [state, setState] = useState<{
    page: number
    pageSize: number
    sort?: string
    direction?: 'asc' | 'desc'
    rowStatus?: string
  }>({ page: 1, pageSize: 25 })
  const [selected, setSelected] = useState<ReportRow | null>(null)

  // A new search or filter set starts again at page 1.
  const scopeKey = JSON.stringify([search, filters])
  const [pagedFor, setPagedFor] = useState(scopeKey)
  if (pagedFor !== scopeKey) {
    setPagedFor(scopeKey)
    setState((s) => ({ ...s, page: 1 }))
  }

  const query = useQuery(
    reportPageQuery('attention', { ...filters, ...state, search: search || undefined } as never),
  )
  const data = query.data

  return (
    <PanelCard
      title="Learners requiring attention"
      description={
        data
          ? `${data.summary.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(' · ')}. Select a row for details.`
          : 'Inactivity, failed prerequisites, absences, revisions and overdue marking.'
      }
      action={
        <div className="flex items-end gap-2">
          <div className="w-60">
            <FilterSelect
              id="attention-reason"
              label="Reason"
              allLabel="All reasons"
              value={state.rowStatus}
              options={data?.statusOptions ?? []}
              onChange={(rowStatus) => setState((s) => ({ ...s, rowStatus, page: 1 }))}
            />
          </div>
          <div className="relative w-60">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search learners requiring attention"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search learners"
              className="h-9 ps-9"
            />
          </div>
        </div>
      }
    >
      <ReportTable
        label="Learners requiring attention"
        data={data}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        onSort={(key) =>
          setState((s) => ({
            ...s,
            sort: key,
            direction: s.sort === key && s.direction === 'asc' ? 'desc' : 'asc',
          }))
        }
        onPage={(page) => setState((s) => ({ ...s, page }))}
        onPageSize={(pageSize) => setState((s) => ({ ...s, pageSize, page: 1 }))}
        onRowClick={setSelected}
        onClearSearch={() => {
          setTerm('')
          setState((s) => ({ ...s, rowStatus: undefined, page: 1 }))
        }}
        maxHeight={520}
      />
      <RowDetailSheet
        report="attention"
        data={data}
        row={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </PanelCard>
  )
}
