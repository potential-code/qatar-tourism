import { PROGRAMME_CODES, type ProgrammeCode } from '@shared/constants'

/** `/programmes/a` → 'A'. Anything else is not a programme. */
export function programmeFromSlug(slug: string): ProgrammeCode | null {
  const code = slug.toUpperCase()
  return (PROGRAMME_CODES as readonly string[]).includes(code) ? (code as ProgrammeCode) : null
}
