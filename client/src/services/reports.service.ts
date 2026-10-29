import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import type { Role } from '@shared/roles'
import { DATE_FIELD_LABELS } from '@shared/schemas/admin-labels'
import {
  type ReportExportQuery,
  type ReportKey,
  reportExportQuery,
  reportPageQuery,
  reportParam,
} from '@shared/schemas/admin-reports'
import type { z } from 'zod'
import { loadFacts } from './analytics/facts'
import { cohort } from './analytics/filters'
import { ApiError, commit, delay, now, parseInput, requireRole, requireUser } from './api'
import { audit } from './audit.service'
import { buildCsv, csvFilename } from './reports/csv'
import { canExportReports, permittedColumns } from './reports/policy'
import { applyListQuery, stripForbidden } from './reports/query'
import { REPORTS } from './reports/registry'

/**
 * Academy-wide reports (brief §12–13), formerly /api/reports. Admin only. Field permissions
 * remove contact columns from the page AND the CSV; every export attempt is audited, and a role
 * without export rights gets the brief's verbatim blocked message.
 */

export type ReportPageInput = Partial<z.input<typeof reportPageQuery>>
export type ReportExportInput = Partial<z.input<typeof reportExportQuery>>

/** Loads, filters, sorts and strips a report for the viewer's role. */
function resolve(role: Role, key: ReportKey, query: ReportExportQuery) {
  const def = REPORTS[key]
  const facts = loadFacts()
  const ctx = { facts, cohort: cohort(facts, query), query }
  const columns = permittedColumns(role, def.columns)
  const loaded = def.load(ctx)
  const rows = stripForbidden(applyListQuery(def, loaded, columns, query), def.columns, columns)
  return { def, columns, rows, ctx }
}

/** One page of a report: permitted columns, summary, rows and paging. */
export async function getReportPage(report: ReportKey, input: ReportPageInput = {}) {
  await delay()
  const viewer = requireRole('admin')
  const { report: key } = parseInput(reportParam, { report }, 'param')
  const query = parseInput(reportPageQuery, input, 'query')
  const { def, columns, rows, ctx } = resolve(viewer.role, key, query)
  const start = (query.page - 1) * query.pageSize
  const sortable = Boolean(query.sort && columns.some((c) => c.key === query.sort))
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
    statusOptions: [...(def.statusOptions ?? [])],
    sort: {
      key: sortable ? (query.sort as string) : def.defaultSort.key,
      direction: sortable ? query.direction : def.defaultSort.direction,
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

/**
 * The CSV of every matching row, permitted columns only, for the caller to download. Audited
 * as `export.report_csv`. A role without export rights is refused with the brief's message
 * and the attempt is audited as denied (brief §11), enforced here rather than by a hidden button.
 */
export async function exportReportCsv(report: ReportKey, input: ReportExportInput = {}) {
  await delay()
  const viewer = requireUser()
  if (!canExportReports(viewer.role)) {
    audit({
      action: 'export.denied',
      objectType: 'export',
      objectId: report,
      after: { report, format: 'csv' },
      reason: 'Role does not allow this export',
      outcome: 'denied',
    })
    commit()
    throw new ApiError(403, 'EXPORT_BLOCKED', EXPORT_BLOCKED_MESSAGE)
  }
  const { report: key } = parseInput(reportParam, { report }, 'param')
  const query = parseInput(reportExportQuery, input, 'query')
  const { def, columns, rows } = resolve(viewer.role, key, query)
  const csv = buildCsv(
    // Dates leave as ISO 8601 instants in UTC; the header says so (the screens show Qatar time).
    columns.map((column) =>
      column.type === 'date' || column.type === 'datetime'
        ? `${column.header} (UTC)`
        : column.header,
    ),
    rows.map((row) => columns.map((column) => row[column.key] ?? null)),
  )
  const summary = {
    report: def.key,
    title: def.title,
    format: 'csv',
    rows: rows.length,
    columns: columns.map((column) => column.key),
    hiddenColumns: def.columns.filter((c) => !columns.includes(c)).map((c) => c.key),
    filters: Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    ),
  }
  audit({
    action: 'export.report_csv',
    objectType: 'export',
    objectId: def.key,
    after: summary,
  })
  commit()
  return { csv, filename: csvFilename(def.title, now()), rows: rows.length }
}

export type ReportPage = Awaited<ReturnType<typeof getReportPage>>
