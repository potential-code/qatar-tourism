import { Download, Loader2, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterSelect } from '@/features/admin-dashboard/components/filters/FilterSelect'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { ReportPage } from '../queries/reports.queries'
import { type ReportSearch, VIEW_LABELS } from '../utils/search'

/** Search, status filter, drill-down view chip and CSV export for one report. */
export function ReportToolbar({
  id,
  data,
  search,
  update,
  onExport,
  exporting,
  searchHint = 'Learner ID, name, organisation, title',
}: {
  searchHint?: string
  id: string
  data: ReportPage | undefined
  search: ReportSearch
  update: (patch: Partial<ReportSearch>) => void
  onExport: () => void
  exporting: boolean
}) {
  const [term, setTerm] = useState(search.search ?? '')
  const debounced = useDebouncedValue(term)
  useEffect(() => {
    if ((search.search ?? '') !== debounced) update({ search: debounced || undefined })
  }, [debounced, search.search, update])
  useEffect(() => setTerm(search.search ?? ''), [search.search])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid min-w-72 flex-1 gap-1.5">
        <label htmlFor={`${id}-search`} className="text-xs font-medium text-muted-foreground">
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={`${id}-search`}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchHint}
            className="h-9 ps-9"
          />
        </div>
      </div>
      {data?.statusOptions.length ? (
        <div className="w-56">
          <FilterSelect
            id={`${id}-status`}
            label="Status"
            allLabel="All statuses"
            value={search.rowStatus}
            options={data.statusOptions}
            onChange={(value) => update({ rowStatus: value })}
          />
        </div>
      ) : null}
      {search.view ? (
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-maroon/20 bg-maroon-mist ps-3 pe-1 text-xs text-maroon-deep">
          Showing: <span className="font-medium">{VIEW_LABELS[search.view]}</span>
          <button
            type="button"
            aria-label="Show all rows"
            onClick={() => update({ view: undefined })}
            className="grid size-6 place-items-center rounded-full hover:bg-maroon/10"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ) : null}
      <div className="ms-auto flex items-center gap-3">
        <p className="max-w-56 text-end text-[11px] leading-tight text-muted-foreground">
          CSV (UTF-8, opens in Excel). Uses the active filters and your field permissions.
        </p>
        <Button onClick={onExport} disabled={exporting || !data || data.total === 0}>
          {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          {exporting ? 'Preparing CSV' : 'Export CSV'}
        </Button>
      </div>
    </div>
  )
}
