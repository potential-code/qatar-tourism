import type { CrmMappingRow } from '@shared/types/db'

/**
 * Field-mapping logic (SPEC §8): value maps, transformations and the preview of a change on a
 * synthetic record. Pure functions, so the page can preview before anything is saved.
 */

const PROGRAMME_CODES = ['A', 'B', 'C'] as const
export type ProgrammeLetter = (typeof PROGRAMME_CODES)[number]

const VALUE_MAP_ENTRY = /(QT-[A-Z]+) to Program ([ABC])/g
const PREFIX = 'Value map: '

/** Reads "Value map: QT-B to Program B, QT-C to Program C" into { 'QT-B': 'B', 'QT-C': 'C' }. */
export function parseValueMap(transformation: string | null): Record<string, ProgrammeLetter> {
  const map: Record<string, ProgrammeLetter> = {}
  if (!transformation) return map
  for (const match of transformation.matchAll(VALUE_MAP_ENTRY)) {
    const [, code, letter] = match
    if (code && letter) map[code] = letter as ProgrammeLetter
  }
  return map
}

/** Writes the map back. Unmapped codes are listed so the row stays readable. */
export function formatValueMap(
  map: Record<string, ProgrammeLetter>,
  unmapped: readonly string[] = [],
): string {
  const entries = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, letter]) => `${code} to Program ${letter}`)
  const note = unmapped.length > 0 ? ` (${unmapped.join(', ')} has no mapping yet)` : ''
  return `${PREFIX}${entries.join(', ')}${note}`
}

/** The LMS programme letter for a CRM programme code, or null when it is not mapped. */
export function lookupProgramme(
  rows: readonly CrmMappingRow[],
  crmCode: string,
): ProgrammeLetter | null {
  const row = rows.find((r) => r.kind === 'field' && r.crmField === 'programme_code')
  return parseValueMap(row?.transformation ?? null)[crmCode] ?? null
}

/** Applies a mapping transformation to one value. Returns null when it cannot be applied. */
export function applyTransformation(transformation: string | null, value: unknown): unknown {
  const text = (transformation ?? 'Copy').trim()
  if (value === null || value === undefined || value === '') return null
  if (text.startsWith(PREFIX)) {
    return parseValueMap(text)[String(value)] ?? null
  }
  if (/^Percent, rounded/i.test(text)) {
    const n = Number(value)
    return Number.isFinite(n) ? Math.round(n <= 1 ? n * 100 : n) : null
  }
  if (/^Lower-case/i.test(text)) return String(value).toLowerCase()
  if (/^Upper-case/i.test(text)) return String(value).toUpperCase()
  if (/^Trim/i.test(text)) return String(value).trim()
  return value
}

export type MappingPreview = {
  input: unknown
  output: unknown
  conflicts: string[]
  authoritative: 'crm' | 'lms'
  authoritativeLabel: string
  effect: string
}

/** What a row would do to a synthetic record, with any conflict and the authoritative system. */
export function previewMapping(
  row: Pick<
    CrmMappingRow,
    | 'crmField'
    | 'lmsField'
    | 'dataType'
    | 'direction'
    | 'transformation'
    | 'required'
    | 'authoritative'
  >,
  input: string,
): MappingPreview {
  const conflicts: string[] = []
  const trimmed = input.trim()
  const output = applyTransformation(row.transformation, trimmed)
  const authoritativeLabel = row.authoritative === 'crm' ? 'CRM' : 'LMS'
  if (row.required && trimmed === '') {
    conflicts.push(`${row.crmField ?? 'This field'} is required but the record has no value.`)
  }
  if (trimmed !== '' && output === null) {
    conflicts.push(
      row.transformation?.startsWith(PREFIX)
        ? `No mapping for value ${trimmed}. Add it to the value map before syncing.`
        : `The value "${trimmed}" cannot be converted with "${row.transformation ?? 'Copy'}".`,
    )
  }
  if (row.dataType === 'number' && trimmed !== '' && !Number.isFinite(Number(trimmed))) {
    conflicts.push('The data type is number but the value is not numeric.')
  }
  if (row.direction === 'lms_to_crm' && row.authoritative === 'crm') {
    conflicts.push(
      'Direction is LMS to CRM but the CRM is authoritative: the CRM value would replace the LMS value on its next update.',
    )
  }
  if (row.direction === 'crm_to_lms' && row.authoritative === 'lms') {
    conflicts.push(
      'Direction is CRM to LMS but the LMS is authoritative: the LMS value would replace the CRM value on its next update.',
    )
  }
  const flow =
    row.direction === 'both'
      ? 'both ways'
      : row.direction === 'crm_to_lms'
        ? 'from CRM to LMS'
        : 'from LMS to CRM'
  const effect =
    output === null
      ? 'No value would be written.'
      : `${String(output)} would be written to ${row.direction === 'lms_to_crm' ? row.crmField : row.lmsField} (${flow}). ${authoritativeLabel} wins any disagreement.`
  return { input, output, conflicts, authoritative: row.authoritative, authoritativeLabel, effect }
}
