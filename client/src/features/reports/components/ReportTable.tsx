import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { count } from '@/features/admin-dashboard/utils/format'
import { cn } from '@/lib/utils'
import type { ReportPage, ReportRow } from '../queries/reports.queries'
import { ReportCell } from './ReportCell'
import { SortHeader } from './SortHeader'

const NUMERIC = new Set(['number', 'score', 'percent'])

/**
 * Server-paged report table: sortable headers, 25/50/100 page sizes, row drill-down, skeleton,
 * no-result and error states. Scrolls inside a labelled container, never the page.
 */
export function ReportTable({
  label,
  data,
  isLoading,
  isError,
  onRetry,
  onSort,
  onPage,
  onPageSize,
  onRowClick,
  onClearSearch,
  pageSizes = [25, 50, 100],
  maxHeight,
}: {
  label: string
  data: ReportPage | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onSort: (key: string) => void
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  onRowClick: (row: ReportRow) => void
  onClearSearch?: () => void
  pageSizes?: number[]
  maxHeight?: number
}) {
  const reduce = useReducedMotion()
  const columns = (data?.columns ?? []).filter((c) => !c.detailOnly)
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const first = data?.total ? (data.page - 1) * data.pageSize + 1 : 0
  const last = data ? Math.min(data.total, data.page * data.pageSize) : 0

  if (isError && !data)
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          variant="destructive"
          title="This report could not load"
          description="The demo API did not respond. Check your connection and try again."
          action={<Button onClick={onRetry}>Try again</Button>}
        />
      </div>
    )

  return (
    <div className="grid gap-3">
      <section
        aria-label={label}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable for keyboard users
        tabIndex={0}
        className="w-0 min-w-full overflow-auto rounded-xl border bg-card shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-sand-deep/95 backdrop-blur-sm">
            <tr className="border-b">
              {isLoading && !data
                ? Array.from({ length: 7 }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton headers
                    <th key={i} className="h-11 px-4">
                      <Skeleton className="h-3 w-20" />
                    </th>
                  ))
                : columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        data?.sort.key === column.key
                          ? data.sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className={cn('h-11 px-4 text-start', NUMERIC.has(column.type) && 'text-end')}
                    >
                      <SortHeader
                        label={column.header}
                        active={data?.sort.key === column.key}
                        direction={data?.sort.direction ?? 'asc'}
                        onSort={() => onSort(column.key)}
                        numeric={NUMERIC.has(column.type)}
                      />
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && !data ? (
              Array.from({ length: 8 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                <tr key={i} className="border-b last:border-0">
                  {Array.from({ length: 7 }, (_, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
                    <td key={j} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-28" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>
                  <EmptyState
                    icon={SearchX}
                    title="No matching records"
                    description="Nothing matches the current search, status and filters. Clear the search or reset filters to widen the results."
                    action={
                      onClearSearch ? (
                        <Button variant="outline" onClick={onClearSearch}>
                          Clear search and status
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              data?.items.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index, 20) * 0.012 }}
                  tabIndex={0}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  }}
                  aria-label={`Open details for ${String(row[columns[0]?.key ?? 'id'] ?? 'row')}`}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-teal-mist/40 focus-visible:bg-teal-mist/60 focus-visible:outline-none"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-4 py-3', NUMERIC.has(column.type) && 'text-end')}
                    >
                      <ReportCell column={column} value={row[column.key]} />
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground" aria-live="polite">
          {data ? (
            data.total ? (
              <>
                Showing <span className="font-medium text-ink tabular-nums">{count(first)}</span> to{' '}
                <span className="font-medium text-ink tabular-nums">{count(last)}</span> of{' '}
                <span className="font-medium text-ink tabular-nums">{count(data.total)}</span>
              </>
            ) : (
              'No rows'
            )
          ) : (
            'Loading'
          )}
        </p>
        <div className="flex items-center gap-3">
          <label
            className="flex items-center gap-2 text-muted-foreground"
            htmlFor={`${label}-size`}
          >
            Rows per page
            <Select
              value={String(data?.pageSize ?? 25)}
              onValueChange={(v) => onPageSize(Number(v))}
            >
              <SelectTrigger id={`${label}-size`} className="h-8 w-20 rounded-lg bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={!data || data.page <= 1}
              onClick={() => onPage((data?.page ?? 1) - 1)}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <span className="min-w-24 text-center tabular-nums">
              Page {data?.page ?? 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={!data || data.page >= pageCount}
              onClick={() => onPage((data?.page ?? 1) + 1)}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
