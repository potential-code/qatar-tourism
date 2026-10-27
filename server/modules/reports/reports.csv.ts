/**
 * RFC 4180 CSV for report exports, ported from client/src/lib/analytics/csv.ts (the server
 * cannot import client code). Text cells that a spreadsheet would execute (leading = + - @ tab
 * CR) are neutralised with an apostrophe; numbers are left alone. UTF-8 with a byte-order mark
 * so Excel reads accented names correctly. The format is CSV, never labelled as Excel.
 */
import type { CellValue } from './reports.types'

const FORMULA_LEAD = /^[=+\-@\t\r]/

export function escapeCsvCell(value: CellValue): string {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'string' ? value : String(value)
  if (typeof value === 'string' && FORMULA_LEAD.test(text)) text = `'${text}`
  const mustQuote = /[",\r\n]/.test(text) || text !== text.trim()
  return mustQuote ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildCsv(headers: readonly string[], rows: readonly CellValue[][]): string {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCsvCell).join(','))
  return `﻿${lines.join('\r\n')}\r\n`
}

/** `<report>-YYYY-MM-DD.csv`: the slug is squeezed so it cannot steer the header. */
export function csvFilename(name: string, at: Date): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'export'
  return `${slug}-${at.toISOString().slice(0, 10)}.csv`
}
