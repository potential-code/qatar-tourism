import { PATH_ITEM_KINDS, PATH_VERSION_STATUSES, RULE_STATUSES } from '@shared/constants'
import type { RuleGroup } from '@shared/content/paths'
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
import { courses } from './courses'
import { programmes } from './programmes'

export const pathVersionStatusEnum = pgEnum('path_version_status', PATH_VERSION_STATUSES)
export const pathItemKindEnum = pgEnum('path_item_kind', PATH_ITEM_KINDS)
export const ruleStatusEnum = pgEnum('rule_status', RULE_STATUSES)

/** A learning path. A programme may have several (brief §14). */
export const learningPaths = pgTable(
  'learning_paths',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    /** The version new enrolments receive. Null while the path has no published version. */
    currentVersionId: uuid('current_version_id'),
    ...timestamps,
  },
  (table) => [index('learning_paths_programme_idx').on(table.programmeId)],
)

/** Immutable once published: a change publishes a new version, and learners keep theirs. */
export const pathVersions = pgTable(
  'path_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pathId: uuid('path_id')
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: pathVersionStatusEnum('status').notNull().default('draft'),
    changeNote: text('change_note'),
    publishedAt: tstz('published_at'),
    publishedBy: text('published_by').references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [uniqueIndex('path_versions_path_version_uq').on(table.pathId, table.version)],
)

export const pathItems = pgTable(
  'path_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pathVersionId: uuid('path_version_id')
      .notNull()
      .references(() => pathVersions.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    kind: pathItemKindEnum('kind').notNull(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'restrict' }),
    /** Role-play scenario key when kind is ai_practice. */
    scenarioKey: text('scenario_key'),
    title: text('title').notNull(),
    required: boolean('required').notNull().default(true),
    level: smallint('level').notNull().default(1),
    stage: text('stage').notNull(),
    note: text('note'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('path_items_version_position_uq').on(table.pathVersionId, table.position),
  ],
)

/** Which path a profile receives. Conditions are an AND/OR tree; the highest priority wins. */
export const assignmentRules = pgTable(
  'assignment_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'restrict' }),
    pathId: uuid('path_id')
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    summary: text('summary').notNull(),
    conditions: jsonb('conditions').$type<RuleGroup>().notNull(),
    priority: integer('priority').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    status: ruleStatusEnum('status').notNull().default('published'),
    ...timestamps,
  },
  (table) => [
    index('assignment_rules_programme_priority_idx').on(table.programmeId, table.priority),
  ],
)

export type LearningPathRow = typeof learningPaths.$inferSelect
export type PathVersionRow = typeof pathVersions.$inferSelect
export type PathItemRow = typeof pathItems.$inferSelect
export type AssignmentRuleRow = typeof assignmentRules.$inferSelect
