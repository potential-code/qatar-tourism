import { ORGANISATION_TYPES } from '@shared/constants'
import { boolean, index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'

export const organisationTypeEnum = pgEnum('organisation_type', ORGANISATION_TYPES)

/** Fictional organisations only: every display name starts with "Demo" (brief §15). */
export const organisations = pgTable(
  'organisations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull().unique(),
    type: organisationTypeEnum('type').notNull(),
    city: text('city'),
    /** True for the "Independent professional" / "Not currently employed" pseudo-organisations. */
    isPseudo: boolean('is_pseudo').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('organisations_type_idx').on(table.type)],
)

export type OrganisationRow = typeof organisations.$inferSelect
export type NewOrganisationRow = typeof organisations.$inferInsert
