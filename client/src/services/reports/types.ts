import type { LearnerField } from '@shared/permissions'
import type { ReportExportQuery, ReportKey } from '@shared/schemas/admin-reports'
import type { EnrolmentFact, Facts } from '../analytics/types'

export type CellValue = string | number | boolean | null

/** Every report row is flat so search, sort, the table and the CSV treat it the same way. */
export type ReportRow = { id: string } & Record<string, CellValue>

export type ColumnType =
  | 'text'
  | 'code'
  | 'number'
  | 'percent'
  | 'score'
  | 'date'
  | 'datetime'
  | 'status'
  | 'programme'

export type ReportColumn = {
  key: string
  header: string
  type: ColumnType
  /**
   * The learner field this column exposes, if any. A column whose field the viewer's role may
   * not see (shared/permissions.ts) is removed from the page AND the CSV, and its values are
   * stripped from every row before the response is built.
   */
  field?: LearnerField
  /** Hidden in the table by default but kept in the row detail panel and the CSV. */
  detailOnly?: boolean
}

export type ReportContext = {
  facts: Facts
  /** The enrolments matching the top filters (the governed cohort). */
  cohort: EnrolmentFact[]
  query: ReportExportQuery
}

export type ReportDefinition = {
  key: ReportKey
  title: string
  description: string
  /** Which top filters the report honours (shown beside the active-filter chips). */
  filterScope: 'cohort' | 'programme' | 'none'
  columns: readonly ReportColumn[]
  /** The row key a status filter tests, and its allowed values. */
  statusKey?: string
  statusOptions?: readonly { value: string; label: string }[]
  defaultSort: { key: string; direction: 'asc' | 'desc' }
  searchKeys: readonly string[]
  load: (ctx: ReportContext) => ReportRow[]
  /** Headline counts over the filtered rows (e.g. unique learners beside enrolments). */
  summarise?: (rows: readonly ReportRow[], ctx: ReportContext) => { label: string; value: string }[]
}
