import { db } from '@server/db/connection'
import { organisations } from '@server/db/schema'
import type { OrganisationType } from '@shared/constants'
import { and, asc, eq, ilike, sql } from 'drizzle-orm'

export type OrganisationSearch = { q?: string; type?: OrganisationType }

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

const columns = {
  id: organisations.id,
  code: organisations.code,
  name: organisations.name,
  type: organisations.type,
  city: organisations.city,
  isPseudo: organisations.isPseudo,
}

/**
 * Organisation search for the profile wizard (brief §4). The pseudo organisations
 * ("Independent professional", "Not currently employed") always come back so they stay selectable.
 */
export async function searchOrganisations(query: OrganisationSearch) {
  const rows = await db
    .select(columns)
    .from(organisations)
    .where(
      and(
        eq(organisations.isPseudo, false),
        query.q ? ilike(organisations.name, likePattern(query.q)) : undefined,
        query.type ? eq(organisations.type, query.type) : undefined,
      ),
    )
    .orderBy(asc(organisations.name))
    .limit(40)
  const pseudo = await db
    .select(columns)
    .from(organisations)
    .where(eq(organisations.isPseudo, true))
    .orderBy(asc(organisations.name))
  return [...rows, ...pseudo]
}

type Executor = Pick<typeof db, 'select' | 'insert'>

/**
 * "Other" organisation typed by a learner (brief §4). Reuses an organisation with the same name
 * (case-insensitive) or records a new one with the chosen type, so path rules that test the
 * organisation type keep working.
 */
export async function findOrCreateOtherOrganisation(
  name: string,
  type: OrganisationType,
  executor: Executor = db,
) {
  const trimmed = name.trim()
  const [existing] = await executor
    .select()
    .from(organisations)
    .where(sql`lower(${organisations.name}) = lower(${trimmed})`)
    .limit(1)
  if (existing) return existing
  const code = `ORG-U-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const [created] = await executor
    .insert(organisations)
    .values({ code, name: trimmed, type, city: null, isPseudo: false })
    .returning()
  if (!created) throw new Error('Could not record the organisation')
  return created
}
