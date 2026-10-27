import { date, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { tstz } from './columns'

/** Singleton row (id = 1): the demo reference date and the snapshot it belongs to. */
export const demoMeta = pgTable('demo_meta', {
  id: integer('id').primaryKey().default(1),
  /** YYYY-MM-DD: every "Day +N" offset in the seed is relative to it. */
  referenceDate: date('reference_date', { mode: 'string' }).notNull(),
  seedVersion: text('seed_version').notNull(),
  /** Real instant the demo clock read `referenceDate` 08:00 Qatar (see server/lib/clock.ts). */
  anchoredAt: tstz('anchored_at').notNull(),
  seededAt: tstz('seeded_at').notNull(),
  counts: jsonb('counts').$type<Record<string, number>>().notNull().default({}),
})

export type DemoMetaRow = typeof demoMeta.$inferSelect
