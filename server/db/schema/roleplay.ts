import { ROLEPLAY_MODES } from '@shared/constants'
import { boolean, index, jsonb, pgEnum, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps, tstz } from './columns'
import { enrolments } from './enrolments'

export const rolePlayModeEnum = pgEnum('roleplay_mode', ROLEPLAY_MODES)

export type TranscriptTurn = { speaker: 'visitor' | 'learner'; text: string }
export type CriterionFeedback = { key: string; score: number; evidence: string; suggestion: string }

/**
 * Simulated AI practice attempt (brief §9). Five criteria scored 0–4, total out of 20, shown
 * out of 100. Each criterion carries one evidence excerpt and an improvement suggestion.
 */
export const rolePlayAttempts = pgTable(
  'roleplay_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrolmentId: uuid('enrolment_id')
      .notNull()
      .references(() => enrolments.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    scenarioKey: text('scenario_key').notNull(),
    mode: rolePlayModeEnum('mode').notNull(),
    transcript: jsonb('transcript').$type<TranscriptTurn[]>().notNull(),
    empathyScore: smallint('empathy_score').notNull(),
    discoveryScore: smallint('discovery_score').notNull(),
    clarityScore: smallint('clarity_score').notNull(),
    accuracyScore: smallint('accuracy_score').notNull(),
    solutionScore: smallint('solution_score').notNull(),
    /** Sum of the five criteria, 0–20. */
    totalScore: smallint('total_score').notNull(),
    /** totalScore converted to 0–100. */
    totalPercent: smallint('total_percent').notNull(),
    /** Evidence excerpt and suggestion per criterion, plus a next action and retry tip. */
    feedback: jsonb('feedback')
      .$type<{ criteria: CriterionFeedback[]; strength: string; improve: string; retry: string }>()
      .notNull(),
    /** True when a prerecorded demonstration stood in for live speech services. */
    usedRecordedDemo: boolean('used_recorded_demo').notNull().default(false),
    completedAt: tstz('completed_at').notNull(),
    ...timestamps,
  },
  (table) => [
    index('roleplay_attempts_enrolment_idx').on(table.enrolmentId),
    index('roleplay_attempts_learner_idx').on(table.learnerId),
  ],
)

export type RolePlayAttemptRow = typeof rolePlayAttempts.$inferSelect
