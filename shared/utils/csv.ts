/**
 * CSV export.
 *
 * Two things go wrong with hand-rolled CSV and both are here:
 *
 * 1. **Quoting.** RFC 4180 wants CRLF line breaks, a field quoted whenever it
 *    contains a comma, a quote or a line break, and an embedded quote written
 *    as two quotes. A `join(',')` gets all three wrong the first time a name
 *    contains a comma.
 *
 * 2. **Formula injection.** A spreadsheet treats a cell beginning `=`, `+`,
 *    `-`, `@`, tab or carriage return as a formula. A user-supplied display
 *    name of `=HYPERLINK("http://…")` therefore executes when an administrator
 *    opens the export. Every text cell is neutralised with a leading
 *    apostrophe, which Excel and LibreOffice both strip on display.
 *
 * The guard applies to **text** cells only. A numeric cell is rendered from a
 * `number`, so `-5` stays `-5` rather than becoming `'-5` and arriving as
 * text — the distinction is why `CsvCell` keeps numbers and strings apart
 * instead of stringifying early.
 *
 * No database import and no React import: the builder runs on the server to
 * produce a download, and in a test to assert on the bytes.
 */

/** A value a cell may hold. Strings are guarded; numbers are not. */
export type CsvCell = string | number | boolean | Date | null | undefined

/** One column of an export. */
export interface CsvColumn<T> {
  /** Header text written in the first row. */
  header: string
  /** Reads the cell out of a row. */
  value: (row: T) => CsvCell
}

export interface CsvOptions {
  /**
   * Prefix the output with a UTF-8 byte-order mark. Excel on Windows needs it
   * to read accented characters correctly; almost nothing else wants it.
   * Defaults to true, because the file is usually opened in Excel.
   */
  bom?: boolean
  /** Field separator. Defaults to a comma. */
  delimiter?: string
}

/** Characters that make a spreadsheet treat a cell as a formula. */
const FORMULA_LEAD = /^[=+\-@\t\r]/

/**
 * Neutralises a text cell that a spreadsheet would execute.
 *
 * Exported so a consumer writing its own exporter can reuse exactly this rule
 * rather than a near-miss version of it.
 */
export function neutraliseFormula(value: string): string {
  return FORMULA_LEAD.test(value) ? `'${value}` : value
}

/** Renders one cell: guard, then quote per RFC 4180. */
export function escapeCsvCell(value: CsvCell, delimiter = ','): string {
  if (value === null || value === undefined) return ''

  let text: string
  if (typeof value === 'string') {
    // Text is the only thing a user controls, and the only thing guarded.
    text = neutraliseFormula(value)
  } else if (value instanceof Date) {
    text = value.toISOString()
  } else {
    text = String(value)
  }

  const mustQuote =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text !== text.trim()

  return mustQuote ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * Builds an RFC 4180 document from rows and a column list.
 *
 * ```ts
 * const csv = buildCsv(
 *   [
 *     { header: 'Name', value: (u) => u.fullName },
 *     { header: 'Joined', value: (u) => u.createdAt },
 *   ],
 *   users,
 * )
 * ```
 */
export function buildCsv<T>(
  columns: readonly CsvColumn<T>[],
  rows: readonly T[],
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ','
  const lines: string[] = [
    columns.map((column) => escapeCsvCell(column.header, delimiter)).join(delimiter),
  ]

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(column.value(row), delimiter)).join(delimiter))
  }

  // RFC 4180 line break, and a trailing one so the last record is terminated.
  const body = `${lines.join('\r\n')}\r\n`
  return (options.bom ?? true) ? `﻿${body}` : body
}

/**
 * A safe download filename: `<slug>-YYYY-MM-DD.csv`.
 *
 * The slug is squeezed to lowercase alphanumerics and hyphens, so a report
 * name typed by a user cannot steer the `Content-Disposition` header.
 */
export function csvFilename(name: string, at: Date = new Date()): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'export'
  return `${slug}-${at.toISOString().slice(0, 10)}.csv`
}
