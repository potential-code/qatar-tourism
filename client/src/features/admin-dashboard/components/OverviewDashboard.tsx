import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilterSearch } from '../hooks/useFilterSearch'
import { useOpenReport } from '../hooks/useOpenReport'
import { overviewQuery } from '../queries/analytics.queries'
import { AttentionTable } from './AttentionTable'
import { DashboardHeader } from './DashboardHeader'
import { FilterBar } from './filters/FilterBar'
import { KpiBento } from './KpiBento'
import { PerformanceTable } from './PerformanceTable'
import { AttendancePanel } from './panels/AttendancePanel'
import { CrmCard } from './panels/CrmCard'
import { DistributionPanel } from './panels/DistributionPanel'
import { FunnelPanel } from './panels/FunnelPanel'
import { ImprovementPanel } from './panels/ImprovementPanel'
import { OperationsPanels } from './panels/OperationsPanels'
import { SecureAccessSummary } from './panels/SecureAccessSummary'

const PROGRAMME_REPORT = { A: 'program-a', B: 'program-b', C: 'program-c' } as const

/** The admin Overview dashboard (brief §12). Every widget reads the same governed overview. */
export function OverviewDashboard() {
  const { filters } = useFilterSearch()
  const query = useQuery(overviewQuery(filters))
  const openReport = useOpenReport(filters)
  const data = query.data

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader
        asOf={data?.asOf}
        referenceDate={data?.referenceDate}
        isFetching={query.isFetching}
      />
      <FilterBar />

      {query.isError && !data ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            variant="destructive"
            title="The dashboard could not load"
            description="The demo API did not respond. Check the connection and try again."
            action={<Button onClick={() => query.refetch()}>Try again</Button>}
          />
        </div>
      ) : (
        <>
          <KpiBento data={data} isLoading={query.isLoading} openReport={openReport} />
          {data && data.kpis.enrolments === 0 ? (
            <div className="rounded-xl border bg-card">
              <EmptyState
                title="No learners match these filters"
                description="The cohort is empty, so the charts have nothing to show. Remove a filter or use Reset filters."
              />
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-12 gap-6">
                <DistributionPanel data={data} />
                <FunnelPanel data={data} onOpen={(p) => openReport(PROGRAMME_REPORT[p])} />
              </div>
              <div className="grid grid-cols-12 gap-6">
                <ImprovementPanel data={data} onOpen={() => openReport('assessments')} />
                <AttendancePanel data={data} onOpen={() => openReport('sessions')} />
              </div>
              <OperationsPanels data={data} openReport={openReport} />
              <div className="grid grid-cols-12 gap-6">
                <CrmCard />
                <SecureAccessSummary />
              </div>
              <PerformanceTable data={data} onOpen={(p) => openReport(PROGRAMME_REPORT[p])} />
              <AttentionTable filters={filters} />
            </>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              <Skeleton className="col-span-5 h-96 rounded-xl" />
              <Skeleton className="col-span-7 h-96 rounded-xl" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
