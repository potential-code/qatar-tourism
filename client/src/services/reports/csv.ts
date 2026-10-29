/**
 * Report and audit CSV: a header row plus value rows, on top of the one shared RFC 4180 and
 * formula-injection implementation in `@shared/utils/csv` (UTF-8 BOM, CRLF, text cells that a
 * spreadsheet would execute are neutralised). The format is CSV, never labelled as Excel.
 */
import { buildCsv as buildColumnsCsv, type CsvColumn, csvFilename } from '@shared/utils/csv'
import type { CellValue } from './types'

export { csvFilename }

export function buildCsv(headers: readonly string[], rows: readonly CellValue[][]): string {
  const columns: CsvColumn<readonly CellValue[]>[] = headers.map((header, index) => ({
    header,
    value: (row) => row[index] ?? null,
  }))
  return buildColumnsCsv(columns, rows)
}
