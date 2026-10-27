import { ASSESSMENT_KINDS, ATTEMPT_STATUSES, COMPETENCIES } from '@shared/constants'
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps, tstz } from './columns'
import { enrolments } from './enrolments'

export const assessmentKindEnum = pgEnum('assessment_kind', ASSESSMENT_KINDS)
export const attemptStatusEnum = pgEnum('attempt_status', ATTEMPT_STATUSES)
export const competencyEnum = pgEnum('competency', COMPETENCIES)

/** An assessment definition at a version (brief §8: show the version next to results). */
export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    kind: assessmentKindEnum('kind').notNull(),
    version: text('version').notNull(),
    title: text('title').notNull(),
    /** Minimum percent to pass, where the programme rules set one. */
    passPercent: smallint('pass_percent'),
    ...timestamps,
  },
  (table) => [uniqueIndex('assessments_kind_version_uq').on(table.kind, table.version)],
)

export const assessmentAttempts = pgTable(
  'assessment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'restrict' }),
    enrolmentId: uuid('enrolment_id')
      .notNull()
      .references(() => enrolments.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    attemptNo: smallint('attempt_no').notNull().default(1),
    status: attemptStatusEnum('status').notNull().default('in_progress'),
    /** Percent 0–100 (five items, 20 each). Null until submitted. */
    score: smallint('score'),
    /** { discover_needs: 20, verify_information: 0, … } for the competency chart. */
    competencyScores: jsonb('competency_scores').$type<Record<string, number>>(),
    startedAt: tstz('started_at').notNull(),
    submittedAt: tstz('submitted_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('assessment_attempts_uq').on(
      table.assessmentId,
      table.enrolmentId,
      table.attemptNo,
    ),
    index('assessment_attempts_learner_idx').on(table.learnerId),
    index('assessment_attempts_submitted_idx').on(table.submittedAt),
  ],
)

export const assessmentAnswers = pgTable(
  'assessment_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: 'cascade' }),
    competency: competencyEnum('competency').notNull(),
    selectedOption: text('selected_option').notNull(),
    points: smallint('points').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('assessment_answers_attempt_competency_uq').on(table.attemptId, table.competency),
  ],
)

export type AssessmentRow = typeof assessments.$inferSelect
export type AssessmentAttemptRow = typeof assessmentAttempts.$inferSelect
export type AssessmentAnswerRow = typeof assessmentAnswers.$inferSelect
