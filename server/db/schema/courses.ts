import { COURSE_FORMATS, PACKAGE_TYPES } from '@shared/constants'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { timestamps } from './columns'

export const courseFormatEnum = pgEnum('course_format', COURSE_FORMATS)
export const packageTypeEnum = pgEnum('package_type', PACKAGE_TYPES)

/**
 * Courses C01–C07 (brief §7). A course is also the "unit" a learner progresses through:
 * `unit_progress.course_id` records that progress, and path items place the course in a path.
 */
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  format: courseFormatEnum('format').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  summary: text('summary').notNull(),
  /** Machine-readable completion rule (see shared/content/curriculum CompletionRule). */
  completionRule: jsonb('completion_rule').$type<Record<string, unknown>>().notNull(),
  completionText: text('completion_text').notNull(),
  transcript: text('transcript'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

/** The deliverable behind a course: a video, a SCORM package, a resource. */
export const contentPackages = pgTable(
  'content_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    type: packageTypeEnum('type').notNull(),
    /** Package version, e.g. "1.0". Existing learners keep the version they started. */
    version: text('version').notNull().default('1.0'),
    title: text('title').notNull(),
    /** Relative URL under the client's public folder (e.g. /scorm/qta-sample-c04/index.html). */
    launchUrl: text('launch_url'),
    /** Accurate label, e.g. "SCORM 2004 sample package" (brief §8). */
    formatLabel: text('format_label').notNull(),
    isCurrent: boolean('is_current').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('content_packages_course_idx').on(table.courseId),
    uniqueIndex('content_packages_course_version_uq').on(table.courseId, table.version),
  ],
)

export type CourseRow = typeof courses.$inferSelect
export type ContentPackageRow = typeof contentPackages.$inferSelect
