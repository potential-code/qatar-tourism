import type { ReportKey } from '@shared/schemas/admin-reports'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { DemoBadge, PageHeader } from '@/components/layout'
import { Reveal } from '@/components/motion'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterBar } from '@/features/admin-dashboard/components/filters/FilterBar'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { useReportSearch } from '../hooks/useReportSearch'
import { type ReportRow, reportPageQuery, useExportReport } from '../queries/reports.queries'
import { REPORT_META } from '../utils/meta'
import { ReportTable } from './ReportTable'
import { ReportToolbar } from './ReportToolbar'
import { RowDetailSheet } from './RowDetailSheet'

/** One report page (brief §13): filters, summary, toolbar, table, detail panel, export. */
export function ReportView({ report }: { report: ReportKey }) {
  const { search, update, toggleSort } = useReportSearch()
  const meta = REPORT_META[report]
  // A programme report always reads its own programme, whatever filter the URL carries.
  const effective = meta.programme ? { ...search, programme: meta.programme } : search
  const query = useQuery(reportPageQuery(report, effective))
  const exporter = useExportReport(report, effective, meta.title)
  const [selected, setSelected] = useState<ReportRow | null>(null)
  const data = query.data

  return (
    <>
      <PageHeader
        title={meta.title}
        description={data?.description ?? meta.description}
        breadcrumbs={[{ label: 'Reports', to: '/admin/reports' }, { label: meta.title }]}
        actions={
          <div className="flex items-center gap-3">
            {data ? (
              <span className="text-xs text-muted-foreground">
                Last updated {qatarDateTime(data.asOf, { year: false })}
              </span>
            ) : null}
            <DemoBadge compact />
          </div>
        }
      />
      <FilterBar scope={data?.filterScope ?? meta.scope} lockedProgramme={meta.programme} />

      <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {(data?.summary ?? [null, null]).map((item, index) => (
          <div key={item?.label ?? index} className="rounded-xl border bg-card px-5 py-4 shadow-xs">
            {item ? (
              <>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-display text-3xl leading-none text-ink tabular-nums">
                  {item.value}
                </p>
              </>
            ) : (
              <Skeleton className="h-12 w-32" />
            )}
          </div>
        ))}
      </Reveal>

      <section className="grid gap-4" aria-label={`${meta.title} table`}>
        <ReportToolbar
          id={report}
          data={data}
          search={search}
          update={update}
          searchHint={meta.searchHint}
          onExport={() => exporter.mutate()}
          exporting={exporter.isPending}
        />
        <ReportTable
          label={`${meta.title} records`}
          data={data}
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          onSort={(key) => toggleSort(key, data?.sort)}
          onPage={(page) => update({ page }, false)}
          onPageSize={(pageSize) => update({ pageSize })}
          onRowClick={setSelected}
          onClearSearch={() => update({ search: undefined, rowStatus: undefined, view: undefined })}
          maxHeight={680}
        />
      </section>
      <RowDetailSheet
        report={report}
        data={data}
        row={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  )
}
