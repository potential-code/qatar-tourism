import { now } from '@server/lib/clock'
import type { Viewer } from '@server/middleware/auth.middleware'
import { DATE_FIELD_LABELS } from '@shared/schemas/admin-labels'
import type { ReportExportQuery, ReportKey, ReportPageQuery } from '@shared/schemas/admin-reports'
import { cohort } from '../analytics/analytics.filters'
import * as analyticsService from '../analytics/analytics.service'
import { buildCsv, csvFilename } from './reports.csv'
import { permittedColumns } from './reports.policy'
import { applyListQuery, stripForbidden } from './reports.query'
import { REPORTS } from './reports.registry'

export function ping() {
  return { module: 'reports' as const, status: 'ok' as const }
}

/** Loads, filters, sorts and strips a report for the viewer's role. */
async function resolve(viewer: Viewer, key: ReportKey, query: ReportExportQuery) {
  const def = REPORTS[key]
  const facts = await analyticsService.loadFacts()
  const ctx = { facts, cohort: cohort(facts, query), query }
  const columns = permittedColumns(viewer.role, def.columns)
  const loaded = await def.load(ctx)
  const rows = stripForbidden(applyListQuery(def, loaded, columns, query), def.columns, columns)
  return { def, columns, rows, ctx }
}

export async function page(viewer: Viewer, key: ReportKey, query: ReportPageQuery) {
  const { def, columns, rows, ctx } = await resolve(viewer, key, query)
  const start = (query.page - 1) * query.pageSize
  return {
    report: def.key,
    title: def.title,
    description: def.description,
    filterScope: def.filterScope,
    dateBasis: DATE_FIELD_LABELS[query.dateField],
    columns: columns.map((column) => ({
      key: column.key,
      header: column.header,
      type: column.type,
      detailOnly: column.detailOnly ?? false,
    })),
    /** Columns removed by field permissions: shown to the admin as "hidden for your role". */
    hiddenColumns: def.columns
      .filter((column) => !columns.includes(column))
      .map((column) => column.header),
    statusOptions: def.statusOptions ?? [],
    sort: {
      key:
        query.sort && columns.some((c) => c.key === query.sort) ? query.sort : def.defaultSort.key,
      direction:
        query.sort && columns.some((c) => c.key === query.sort)
          ? query.direction
          : def.defaultSort.direction,
    },
    summary: def.summarise
      ? def.summarise(rows, ctx)
      : [{ label: 'Rows', value: String(rows.length) }],
    items: rows.slice(start, start + query.pageSize),
    total: rows.length,
    page: query.page,
    pageSize: query.pageSize,
    asOf: ctx.facts.asOf.toISOString(),
  }
}

/** CSV of every matching row, permitted columns only. Returned with its audit summary. */
export async function exportCsv(viewer: Viewer, key: ReportKey, query: ReportExportQuery) {
  const { def, columns, rows } = await resolve(viewer, key, query)
  const csv = buildCsv(
    // Dates leave as ISO 8601 instants in UTC; the header says so (the screens show Qatar time).
    columns.map((column) =>
      column.type === 'date' || column.type === 'datetime'
        ? `${column.header} (UTC)`
        : column.header,
    ),
    rows.map((row) => columns.map((column) => row[column.key] ?? null)),
  )
  return {
    csv,
    filename: csvFilename(def.title, now()),
    audit: {
      report: def.key,
      title: def.title,
      format: 'csv',
      rows: rows.length,
      columns: columns.map((column) => column.key),
      hiddenColumns: def.columns.filter((c) => !columns.includes(c)).map((c) => c.key),
      filters: Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
      ),
    },
  }
}
