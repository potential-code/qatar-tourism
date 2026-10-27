import { index, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps } from './columns'
import { programmes } from './programmes'

/** Trainer profile (brief §16). All trainers and providers are fictional. */
export const trainerProfiles = pgTable('trainer_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** T01…T10 */
  code: text('code').notNull().unique(),
  fullName: text('full_name').notNull(),
  headline: text('headline').notNull(),
  bio: text('bio').notNull(),
  expertise: jsonb('expertise').$type<string[]>().notNull().default([]),
  languages: jsonb('languages').$type<string[]>().notNull().default([]),
  organisation: text('organisation').notNull(),
  /** Path under client/public, e.g. /images/generated/trainers/t01.png. */
  avatarPath: text('avatar_path'),
  ...timestamps,
})

/** Programmes a trainer is approved to run sessions for (brief §14). */
export const trainerProgrammes = pgTable(
  'trainer_programmes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainerProfiles.id, { onDelete: 'cascade' }),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('trainer_programmes_uq').on(table.trainerId, table.programmeId),
    index('trainer_programmes_programme_idx').on(table.programmeId),
  ],
)

export type TrainerProfileRow = typeof trainerProfiles.$inferSelect
