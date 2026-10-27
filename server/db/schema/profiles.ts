import {
  EXPERIENCE_BANDS,
  JOB_FUNCTIONS,
  PROFILE_STATUSES,
  SENIORITY_LEVELS,
} from '@shared/constants'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps, tstz } from './columns'
import { organisations } from './organisations'

export const jobFunctionEnum = pgEnum('job_function', JOB_FUNCTIONS)
export const seniorityEnum = pgEnum('seniority', SENIORITY_LEVELS)
export const experienceBandEnum = pgEnum('experience_band', EXPERIENCE_BANDS)
export const profileStatusEnum = pgEnum('profile_status', PROFILE_STATUSES)

/**
 * Learner profile (brief §4). One row per learner user. `learner_code` (L0001…) is the stable,
 * human-visible ID that trainers see instead of an email address.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    learnerCode: text('learner_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    organisationId: uuid('organisation_id').references(() => organisations.id, {
      onDelete: 'set null',
    }),
    /** Free text when the learner chose "Other". */
    organisationOther: text('organisation_other'),
    jobTitle: text('job_title'),
    jobFunction: jobFunctionEnum('job_function'),
    seniority: seniorityEnum('seniority'),
    experience: experienceBandEnum('experience'),
    country: text('country'),
    city: text('city'),
    preferredLanguage: text('preferred_language'),
    captionsPreference: boolean('captions_preference'),
    accessibilityRequest: text('accessibility_request'),
    /** Up to three of LEARNING_GOALS. */
    goals: jsonb('goals').$type<string[]>().notNull().default([]),
    weeklyMinutes: smallint('weekly_minutes'),
    /** Optional, never shown to trainers by default. Seed data holds none. */
    mobile: text('mobile'),
    /** Wizard resume point (1–3) and completeness. */
    wizardStep: smallint('wizard_step').notNull().default(1),
    status: profileStatusEnum('status').notNull().default('draft'),
    consentAcceptedAt: tstz('consent_accepted_at'),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    /** Whether the account is currently suspended from signing in (admin user management). */
    suspended: boolean('suspended').notNull().default(false),
    registeredAt: tstz('registered_at').notNull(),
    lastActivityAt: tstz('last_activity_at'),
    /** Counts used by the profile-completeness meter. */
    completeness: integer('completeness').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('profiles_organisation_idx').on(table.organisationId),
    index('profiles_seniority_idx').on(table.seniority),
    index('profiles_registered_at_idx').on(table.registeredAt),
    index('profiles_last_activity_idx').on(table.lastActivityAt),
  ],
)

export type ProfileRow = typeof profiles.$inferSelect
export type NewProfileRow = typeof profiles.$inferInsert
