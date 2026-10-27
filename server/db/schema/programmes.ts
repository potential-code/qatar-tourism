import { PROGRAMME_CODES, PROGRAMME_STATUSES } from '@shared/constants'
import { boolean, jsonb, pgEnum, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'

export const programmeCodeEnum = pgEnum('programme_code', PROGRAMME_CODES)
export const programmeStatusEnum = pgEnum('programme_status', PROGRAMME_STATUSES)

/** Programmes A, B and C (brief §3). Certification is on for A only; B and C stay off. */
export const programmes = pgTable('programmes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: programmeCodeEnum('code').notNull().unique(),
  title: text('title').notNull(),
  audience: text('audience').notNull(),
  summary: text('summary').notNull(),
  formatLabel: text('format_label').notNull(),
  durationLabel: text('duration_label').notNull(),
  levels: smallint('levels').notNull().default(1),
  certificationEnabled: boolean('certification_enabled').notNull().default(false),
  /** Program C is an illustrative sample, not an actual Qatar Tourism programme. */
  isIllustrative: boolean('is_illustrative').notNull().default(false),
  status: programmeStatusEnum('status').notNull().default('draft'),
  cardImagePath: text('card_image_path'),
  /** Editable completion rules (brief §5 "Completion settings"). */
  completionRules: jsonb('completion_rules').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
})

export type ProgrammeRow = typeof programmes.$inferSelect
