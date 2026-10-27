import type { ReportKey } from '@shared/schemas/admin-reports'
import { keepPreviousData, queryOptions, useMutation } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { toast } from 'sonner'
import { toApiFilters } from '@/features/admin-dashboard/utils/filters'
import { ApiError, api, unwrap } from '@/lib/api'
import type { ReportSearch } from '../utils/search'

export type ReportPage = InferResponseType<(typeof api.reports)[':report']['$get'], 200>
export type ReportRow = ReportPage['items'][number]
export type ReportColumn = ReportPage['columns'][number]

/** Everything after the filters, as API strings. */
function listParams(search: ReportSearch) {
  const out: Record<string, string> = {}
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
    page: String(search.page ?? 1),
    pageSize: String(search.pageSize ?? 25),
  }
  return queryOptions({
    queryKey: ['reports', report, query] as const,
    queryFn: () => unwrap(api.reports[':report'].$get({ param: { report }, query })),
    placeholderData: keepPreviousData,
  })
}

/**
 * Downloads the CSV for the current filters. The server decides the columns (field
 * permissions) and audits the export; the client only saves the file and reports the outcome.
 */
/** `program-b-users-2026-10-27.csv`. The server sends the same name, but a cross-origin
 * response does not expose Content-Disposition to the page, so the client names it too. */
function exportFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date())
  return `${slug || 'report'}-${day}.csv`
}

export function useExportReport(report: ReportKey, search: ReportSearch, title: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.reports[':report'].export.$get({
        param: { report },
        query: { ...toApiFilters(search), ...listParams(search) },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { code: string; message: string }
        } | null
        throw new ApiError(
          res.status,
          body?.error?.code ?? 'EXPORT_FAILED',
          body?.error?.message ?? 'The export failed. Try again.',
        )
      }
      const blob = await res.blob()
      const filename = exportFilename(title)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return { filename }
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
