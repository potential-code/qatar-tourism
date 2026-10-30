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
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useFilterSearch } from '../../hooks/useFilterSearch'
import { filterOptionsQuery } from '../../queries/analytics.queries'
import { ActiveFilters } from './ActiveFilters'
import { FilterSelect } from './FilterSelect'

const options = <K extends string>(keys: readonly K[], labels: Record<K, string>) =>
  keys.map((key) => ({ value: key, label: labels[key] }))

/**
 * Brief §12 top filters: programme, path, organisation type, organisation, seniority, date range
 * (with an explicit registration / activity / completion basis) and learner status, followed by
 * the active-filter chips and Reset filters. `scope` dims filters a report does not honour.
 */
export function FilterBar({
  scope = 'cohort',
  lockedProgramme,
  className,
}: {
  scope?: 'cohort' | 'programme' | 'none'
  /** Set on a programme report: the programme is fixed by the report itself. */
  lockedProgramme?: (typeof PROGRAMME_CODES)[number]
  className?: string
}) {
  const { filters, setFilters } = useFilterSearch()
  const lookups = useQuery(filterOptionsQuery())
  const cohortOnly = scope !== 'cohort'

  const paths = (lookups.data?.paths ?? [])
    .filter((p) => {
      const programme = lockedProgramme ?? filters.programme
      return !programme || p.programme === programme
    })
    .map((p) => ({ value: p.id, label: p.name }))
  const organisations = (lookups.data?.organisations ?? [])
    .filter((o) => !filters.organisationType || o.type === filters.organisationType)
    .map((o) => ({ value: o.id, label: o.name }))

  return (
    <section
      aria-label="Filters"
      className={cn('rounded-xl border bg-card/80 p-4 shadow-xs backdrop-blur-sm', className)}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
        <SlidersHorizontal className="size-4 text-teal" aria-hidden />
        Filters
        {scope !== 'cohort' ? (
          <span className="text-xs font-normal text-muted-foreground">
            {scope === 'programme'
              ? 'This report responds to the programme filter only.'
              : 'This report lists every event; filters do not apply.'}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'grid grid-cols-6 gap-3',
          scope === 'none' && 'pointer-events-none opacity-50',
        )}
      >
        <FilterSelect
          id="f-programme"
          label="Programme"
          allLabel="All programmes"
          value={lockedProgramme ?? filters.programme}
          options={options(PROGRAMME_CODES, PROGRAMME_LABELS)}
          disabled={Boolean(lockedProgramme) || scope === 'none'}
          onChange={(value) =>
            setFilters({ programme: value as typeof filters.programme, pathId: undefined })
          }
        />
        <FilterSelect
          id="f-path"
          label="Path"
          allLabel="All paths"
          value={filters.pathId}
          options={paths}
          disabled={cohortOnly}
          onChange={(value) => setFilters({ pathId: value })}
        />
        <FilterSelect
          id="f-org-type"
          label="Organisation type"
          allLabel="All types"
          value={filters.organisationType}
          options={options(ORGANISATION_TYPES, ORGANISATION_TYPE_LABELS)}
          disabled={cohortOnly}
          onChange={(value) =>
            setFilters({
              organisationType: value as typeof filters.organisationType,
              organisationId: undefined,
            })
          }
        />
        <FilterSelect
          id="f-org"
          label="Organisation"
          allLabel="All organisations"
          value={filters.organisationId}
          options={organisations}
          disabled={cohortOnly}
          onChange={(value) => setFilters({ organisationId: value })}
        />
        <FilterSelect
          id="f-seniority"
          label="Seniority"
          allLabel="All levels"
          value={filters.seniority}
          options={options(SENIORITY_LEVELS, SENIORITY_LABELS)}
          disabled={cohortOnly}
          onChange={(value) => setFilters({ seniority: value as typeof filters.seniority })}
        />
        <FilterSelect
          id="f-status"
          label="Learner status"
          allLabel="All statuses"
          value={filters.status}
          options={options(ENROLMENT_STATUSES, ENROLMENT_STATUS_LABELS)}
          disabled={cohortOnly}
          onChange={(value) => setFilters({ status: value as typeof filters.status })}
        />
        <div className="col-span-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3">
          <FilterSelect
            id="f-date-basis"
            label="Date refers to"
            allLabel="Registration date"
            value={filters.dateField === 'registration' ? undefined : filters.dateField}
            options={[
              { value: 'activity', label: DATE_FIELD_LABELS.activity },
              { value: 'completion', label: DATE_FIELD_LABELS.completion },
            ]}
            disabled={cohortOnly}
            onChange={(value) => setFilters({ dateField: value as typeof filters.dateField })}
          />
          <div className="grid min-w-0 gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground" htmlFor="f-from">
              Date range (Qatar time)
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id="f-from"
                type="date"
                aria-label="From date"
                value={filters.from ?? ''}
                disabled={cohortOnly}
                onChange={(e) => setFilters({ from: e.target.value || undefined })}
                className="h-9 min-w-0 px-2 text-xs"
              />
              <Input
                id="f-to"
                type="date"
                aria-label="To date"
                value={filters.to ?? ''}
                disabled={cohortOnly}
                onChange={(e) => setFilters({ to: e.target.value || undefined })}
                className="h-9 min-w-0 px-2 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
      <ActiveFilters
        lookups={lookups.data}
        scope={lockedProgramme ? `Program ${lockedProgramme}` : undefined}
      />
    </section>
  )
}
