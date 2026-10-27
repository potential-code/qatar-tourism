import { ENROLMENT_STATUSES, UNIT_PROGRESS_STATUSES } from '@shared/constants'
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps, tstz } from './columns'
import { courses } from './courses'
import { learningPaths, pathVersions } from './paths'
import { programmes } from './programmes'

export const enrolmentStatusEnum = pgEnum('enrolment_status', ENROLMENT_STATUSES)
export const unitProgressStatusEnum = pgEnum('unit_progress_status', UNIT_PROGRESS_STATUSES)

/** A learner's registration on one programme. A learner may hold several (brief §1, §15). */
export const enrolments = pgTable(
  'enrolments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'restrict' }),
    status: enrolmentStatusEnum('status').notNull().default('not_started'),
    /** Path and version in force. Learners keep it unless an admin migrates them (brief §14). */
    pathId: uuid('path_id').references(() => learningPaths.id, { onDelete: 'set null' }),
    pathVersionId: uuid('path_version_id').references(() => pathVersions.id, {
      onDelete: 'set null',
    }),
    /** Why this path was assigned, e.g. "Rule match (priority 20): B Hotel guest services". */
    assignmentReason: text('assignment_reason'),
    /** Set only when an administrator overrode the rule (brief §4, §9). */
    overrideReason: text('override_reason'),
    overriddenBy: text('overridden_by').references(() => user.id, { onDelete: 'set null' }),
    /** Programme-specific stage label, e.g. "Level 1: Foundation learning". */
    currentStage: text('current_stage'),
    progressPercent: smallint('progress_percent').notNull().default(0),
    enrolledAt: tstz('enrolled_at').notNull(),
    startedAt: tstz('started_at'),
    completedAt: tstz('completed_at'),
    lastActivityAt: tstz('last_activity_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('enrolments_learner_programme_uq').on(table.learnerId, table.programmeId),
    index('enrolments_programme_status_idx').on(table.programmeId, table.status),
    index('enrolments_last_activity_idx').on(table.lastActivityAt),
  ],
)

/** Progress on one course (unit) for one enrolment, including the SCORM runtime fields. */
export const unitProgress = pgTable(
  'unit_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrolmentId: uuid('enrolment_id')
      .notNull()
      .references(() => enrolments.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    status: unitProgressStatusEnum('status').notNull().default('not_started'),
    percent: smallint('percent').notNull().default(0),
    /** SCORM 2004 cmi.completion_status: completed | incomplete | not attempted | unknown. */
    cmiCompletionStatus: text('cmi_completion_status'),
    /** SCORM 2004 cmi.success_status: passed | failed | unknown. */
    cmiSuccessStatus: text('cmi_success_status'),
    scoreRaw: real('score_raw'),
    sessionTimeSeconds: integer('session_time_seconds').notNull().default(0),
    /** cmi.suspend_data and cmi.location: what lets a closed package resume. */
    suspendData: text('suspend_data'),
    location: text('location'),
    /** Counted once: a reported pass updates progress a single time. */
    completedAt: tstz('completed_at'),
    /** 'learner' for activity in this system; 'historical' for seeded pre-window history. */
    source: text('source').notNull().default('learner'),
    extra: jsonb('extra').$type<Record<string, unknown>>(),
    lastActivityAt: tstz('last_activity_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('unit_progress_enrolment_course_uq').on(table.enrolmentId, table.courseId),
    index('unit_progress_course_idx').on(table.courseId),
  ],
)

export type EnrolmentRow = typeof enrolments.$inferSelect
export type NewEnrolmentRow = typeof enrolments.$inferInsert
export type UnitProgressRow = typeof unitProgress.$inferSelect
