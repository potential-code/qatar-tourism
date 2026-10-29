import type { ReportKey } from '@shared/schemas/admin-reports'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiFilters } from '@/features/admin-dashboard/utils/filters'
import { downloadCsv } from '@/lib/download'
import * as reports from '@/services/reports.service'
import type { ReportSearch } from '../utils/search'

export type { ReportPage } from '@/services/reports.service'
export type ReportRow = reports.ReportPage['items'][number]
export type ReportColumn = reports.ReportPage['columns'][number]

/** Everything after the filters: search, sort, status and view. */
function listParams(search: ReportSearch) {
  const out: { search?: string; sort?: string; direction?: 'asc' | 'desc'; rowStatus?: string } & {
    view?: ReportSearch['view']
  } = {}
  if (search.search) out.search = search.search
  if (search.sort) out.sort = search.sort
  if (search.direction) out.direction = search.direction
  if (search.rowStatus) out.rowStatus = search.rowStatus
  if (search.view) out.view = search.view
  return out
}

export const reportPageQuery = (report: ReportKey, search: ReportSearch) => {
  const query = {
    ...toApiFilters(search),
    ...listParams(search),
    page: search.page ?? 1,
    pageSize: search.pageSize ?? 25,
  }
  return queryOptions({
    queryKey: ['reports', report, query] as const,
    queryFn: () => reports.getReportPage(report, query),
    placeholderData: keepPreviousData,
  })
}

/**
 * Downloads the CSV for the current filters. The service decides the columns (field
 * permissions) and audits the export; the hook only saves the file and reports the outcome.
 */
export function useExportReport(report: ReportKey, search: ReportSearch) {
  return useMutation({
    mutationFn: async () => {
      const result = await reports.exportReportCsv(report, {
        ...toApiFilters(search),
        ...listParams(search),
      })
      downloadCsv(result.csv, result.filename)
      return { filename: result.filename }
    },
    onSuccess: ({ filename }) =>
      toast.success('Export ready', {
        description: `${filename} downloaded (CSV, UTF-8). The export was recorded in the audit log.`,
      }),
    onError: (error) =>
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Try again.',
      }),
  })
}
