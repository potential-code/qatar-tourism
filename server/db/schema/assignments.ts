import { REVIEW_STATUSES, SUBMISSION_STATUSES } from '@shared/constants'
import {
  boolean,
  index,
  integer,
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
import { programmes } from './programmes'
import { trainerProfiles } from './trainers'

export const submissionStatusEnum = pgEnum('submission_status', SUBMISSION_STATUSES)
export const reviewStatusEnum = pgEnum('review_status', REVIEW_STATUSES)

/** Assignment definitions: the A practical assignment and the B short response. */
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  programmeId: uuid('programme_id')
    .notNull()
    .references(() => programmes.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  brief: text('brief').notNull(),
  wordMin: integer('word_min'),
  wordMax: integer('word_max'),
  /** True where an upload (PDF/DOCX or MP4) is an alternative to written text. */
  allowsUpload: boolean('allows_upload').notNull().default(false),
  passPercent: smallint('pass_percent').notNull().default(70),
  ...timestamps,
})

/** One row per submitted version. Version history is the set of rows for an enrolment. */
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'restrict' }),
    enrolmentId: uuid('enrolment_id')
      .notNull()
      .references(() => enrolments.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    version: smallint('version').notNull().default(1),
    status: submissionStatusEnum('status').notNull().default('submitted'),
    responseText: text('response_text'),
    wordCount: integer('word_count'),
    /** File metadata only; no real file is stored for seeded rows. */
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    storagePath: text('storage_path'),
    /** Trainer who marks this submission: bounds a trainer's view (brief §10). */
    markerTrainerId: uuid('marker_trainer_id').references(() => trainerProfiles.id, {
      onDelete: 'set null',
    }),
    submittedAt: tstz('submitted_at').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('submissions_version_uq').on(table.assignmentId, table.enrolmentId, table.version),
    index('submissions_status_idx').on(table.status, table.submittedAt),
    index('submissions_marker_idx').on(table.markerTrainerId),
    index('submissions_learner_idx').on(table.learnerId),
  ],
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .unique()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id').references(() => user.id, { onDelete: 'set null' }),
    /** 0–100. Pass mark 70; revisions are permitted. */
    rubricScore: smallint('rubric_score').notNull(),
    rubricBreakdown: jsonb('rubric_breakdown').$type<Record<string, number>>(),
    feedback: text('feedback').notNull(),
    status: reviewStatusEnum('status').notNull(),
    reviewedAt: tstz('reviewed_at').notNull(),
    ...timestamps,
  },
  (table) => [index('reviews_reviewer_idx').on(table.reviewerId)],
)

export type AssignmentRow = typeof assignments.$inferSelect
export type SubmissionRow = typeof submissions.$inferSelect
export type ReviewRow = typeof reviews.$inferSelect
