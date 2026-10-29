import type { OrganisationType } from '@shared/constants'
import { organisationSearchQuery } from '@shared/schemas'
import type { OrganisationRow } from '@shared/types/db'
import { db, delay, insertRow, newId, out, parseInput, requireUser } from './api'

/**
 * Organisation reference data (brief §4, §15), formerly server/modules/organisations. Fictional
 * organisations only, never learner records, so any signed-in role may read it: learners for
 * the profile wizard, staff for filters.
 */

export type OrganisationSearch = { q?: string; type?: OrganisationType }

const SEARCH_LIMIT = 40

const toOption = (row: OrganisationRow) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  type: row.type,
  city: row.city,
  isPseudo: row.isPseudo,
})

export type OrganisationOption = ReturnType<typeof toOption>

const byName = (a: OrganisationRow, b: OrganisationRow) => a.name.localeCompare(b.name)

/**
 * Organisation search for the profile wizard. Matches the name case-insensitively (literally:
 * no wildcards). The pseudo organisations ("Independent professional", "Not currently
 * employed") always come back so they stay selectable.
 */
export async function searchOrganisations(query: OrganisationSearch = {}) {
  await delay()
  requireUser()
  const { q, type } = parseInput(organisationSearchQuery, query, 'query')
  const term = q?.toLowerCase()
  const matches = db.organisations
    .filter(
      (o) =>
        !o.isPseudo && (!term || o.name.toLowerCase().includes(term)) && (!type || o.type === type),
    )
    .sort(byName)
    .slice(0, SEARCH_LIMIT)
  const pseudo = db.organisations.filter((o) => o.isPseudo).sort(byName)
  return out([...matches, ...pseudo].map(toOption))
}

/**
 * "Other" organisation typed by a learner (brief §4). Reuses an organisation with the same name
 * (case-insensitive) or records a new one with the chosen type, so path rules that test the
 * organisation type keep working. Synchronous; the caller commits.
 */
export function findOrCreateOtherOrganisation(name: string, type: OrganisationType) {
  const trimmed = name.trim()
  const existing = db.organisations.find((o) => o.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return existing
  const code = `ORG-U-${newId().slice(0, 8).toUpperCase()}`
  return insertRow('organisations', { code, name: trimmed, type, city: null, isPseudo: false })
}
