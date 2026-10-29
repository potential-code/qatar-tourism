import type { ReportExportQuery } from '@shared/schemas/admin-reports'
import { ApiError } from '../api'
import type { CellValue, ReportColumn, ReportDefinition, ReportRow } from './types'

/** Pure search, status filter and sort over loaded rows: shared by the page and the CSV. */
export function applyListQuery(
  def: ReportDefinition,
  rows: readonly ReportRow[],
  columns: readonly ReportColumn[],
  query: ReportExportQuery,
): ReportRow[] {
  let out = [...rows]

  if (query.rowStatus) {
    const known = def.statusOptions?.some((option) => option.value === query.rowStatus)
    if (!def.statusKey || !known)
      throw ApiError.badRequest(`Unknown status filter for ${def.title}`)
    const key = def.statusKey
    out = out.filter((row) => row[key] === query.rowStatus)
  }

  const term = query.search?.toLowerCase()
  if (term) {
    out = out.filter((row) =>
      def.searchKeys.some((key) =>
        String(row[key] ?? '')
          .toLowerCase()
          .includes(term),
      ),
    )
  }

  // Sorting is only allowed on a permitted column: a stripped field cannot leak through order.
  const sortable = new Set(columns.map((column) => column.key))
  const sortKey = query.sort && sortable.has(query.sort) ? query.sort : def.defaultSort.key
  const direction =
    query.sort && sortable.has(query.sort) ? query.direction : def.defaultSort.direction
  const factor = direction === 'desc' ? -1 : 1
  out.sort((a, b) => compareCells(a[sortKey], b[sortKey]) * factor || a.id.localeCompare(b.id))
  return out
}

/** Nulls sort last in either direction would hide them; here they sort as the smallest value. */
function compareCells(a: CellValue | undefined, b: CellValue | undefined): number {
  const aNull = a === null || a === undefined
  const bNull = b === null || b === undefined
  if (aNull || bNull) return aNull === bNull ? 0 : aNull ? -1 : 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'en-GB', { numeric: true, sensitivity: 'base' })
}

/** Removes every value a forbidden column would have exposed. */
export function stripForbidden(
  rows: readonly ReportRow[],
  all: readonly ReportColumn[],
  permitted: readonly ReportColumn[],
): ReportRow[] {
  const allowed = new Set(permitted.map((column) => column.key))
  const forbidden = all.filter((column) => !allowed.has(column.key)).map((column) => column.key)
  if (forbidden.length === 0) return [...rows]
  return rows.map((row) => {
    const copy: ReportRow = { ...row }
    for (const key of forbidden) delete copy[key]
    return copy
  })
}
