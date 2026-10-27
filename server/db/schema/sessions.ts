import {
  ATTENDANCE_VALUES,
  RSVP_STATUSES,
  SCORE_STATUSES,
  SESSION_FORMATS,
  SESSION_STATUSES,
} from '@shared/constants'
import { sql } from 'drizzle-orm'
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
import { programmes } from './programmes'
import { trainerProfiles } from './trainers'

export const sessionFormatEnum = pgEnum('session_format', SESSION_FORMATS)
export const sessionStatusEnum = pgEnum('session_status', SESSION_STATUSES)
export const rsvpStatusEnum = pgEnum('rsvp_status', RSVP_STATUSES)
export const attendanceValueEnum = pgEnum('attendance_value', ATTENDANCE_VALUES)
export const scoreStatusEnum = pgEnum('score_status', SCORE_STATUSES)

/**
 * A trainer-led session (brief §10). A rescheduled session keeps its ID and RSVP history; the
 * old times live in `session_reschedules`. Times are UTC; `timezone` is Asia/Qatar by default.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human-readable ID shown in reports, e.g. SES-T03-2. */
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    programmeId: uuid('programme_id')
      .notNull()
      .references(() => programmes.id, { onDelete: 'restrict' }),
    /** "Level 2" / "Trainer-led application", or null for optional sessions. */
    level: text('level'),
    stage: text('stage'),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainerProfiles.id, { onDelete: 'restrict' }),
    format: sessionFormatEnum('format').notNull(),
    startsAt: tstz('starts_at').notNull(),
    endsAt: tstz('ends_at').notNull(),
    timezone: text('timezone').notNull().default('Asia/Qatar'),
    capacity: integer('capacity').notNull(),
    /** In-person: fictional venue, room and access note. */
    venue: text('venue'),
    room: text('room'),
    accessNote: text('access_note'),
    /** Live online: demo meeting-room reference and join instructions (simulated adapter). */
    meetingRef: text('meeting_ref'),
    joinInstructions: text('join_instructions'),
    bookingDeadline: tstz('booking_deadline'),
    cancellationPolicy: text('cancellation_policy').notNull(),
    description: text('description').notNull(),
    materials: jsonb('materials').$type<{ title: string; url: string }[]>().notNull().default([]),
    /** e.g. "a_level1_complete". Null when optional: optional B sessions are never gates. */
    prerequisite: text('prerequisite'),
    /** False for the optional B sessions and the C sample: they never gate completion. */
    isCompletionGate: boolean('is_completion_gate').notNull().default(false),
    status: sessionStatusEnum('status').notNull().default('draft'),
    cancelledReason: text('cancelled_reason'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [
    index('sessions_trainer_starts_idx').on(table.trainerId, table.startsAt),
    index('sessions_programme_status_idx').on(table.programmeId, table.status),
    index('sessions_starts_idx').on(table.startsAt),
  ],
)

/** Separate reschedule history (brief §10): who moved it, from when to when, and why. */
export const sessionReschedules = pgTable(
  'session_reschedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    previousStartsAt: tstz('previous_starts_at').notNull(),
    previousEndsAt: tstz('previous_ends_at').notNull(),
    newStartsAt: tstz('new_starts_at').notNull(),
    newEndsAt: tstz('new_ends_at').notNull(),
    previousVenue: text('previous_venue'),
    newVenue: text('new_venue'),
    reason: text('reason').notNull(),
    affectedRsvps: integer('affected_rsvps').notNull().default(0),
    /** The same event ID is on every notification this change created (deduplication). */
    eventId: text('event_id').notNull().unique(),
    changedBy: text('changed_by').references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [index('session_reschedules_session_idx').on(table.sessionId)],
)

/** One row per booking attempt. History is kept: cancelled and moved rows stay. */
export const rsvps = pgTable(
  'rsvps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: rsvpStatusEnum('status').notNull(),
    /** 1-based place in the queue while waitlisted; null otherwise. */
    waitlistPosition: smallint('waitlist_position'),
    /** Set when status = 'moved': the booking that replaced this one. */
    replacedByRsvpId: uuid('replaced_by_rsvp_id'),
    cancelledReason: text('cancelled_reason'),
    bookedAt: tstz('booked_at').notNull(),
    ...timestamps,
  },
  (table) => [
    // One active (confirmed or waitlisted) RSVP per learner per session.
    uniqueIndex('rsvps_active_learner_session_uq')
      .on(table.sessionId, table.learnerId)
      .where(sql`${table.status} in ('confirmed', 'waitlisted')`),
    index('rsvps_learner_idx').on(table.learnerId),
    index('rsvps_session_status_idx').on(table.sessionId, table.status),
  ],
)

export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rsvpId: uuid('rsvp_id')
      .notNull()
      .unique()
      .references(() => rsvps.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: attendanceValueEnum('status').notNull().default('pending'),
    markedBy: text('marked_by').references(() => user.id, { onDelete: 'set null' }),
    markedAt: tstz('marked_at'),
    ...timestamps,
  },
  (table) => [
    index('attendance_session_idx').on(table.sessionId),
    index('attendance_learner_idx').on(table.learnerId),
  ],
)

/** Session rubric (brief §10): preparation 20, communication 30, practical 30, professionalism 20. */
export const sessionScores = pgTable(
  'session_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rsvpId: uuid('rsvp_id')
      .notNull()
      .unique()
      .references(() => rsvps.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    learnerId: text('learner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    preparation: smallint('preparation').notNull(),
    communication: smallint('communication').notNull(),
    practical: smallint('practical').notNull(),
    professionalism: smallint('professionalism').notNull(),
    /** Sum of the four rubric rows, 0–100. */
    total: smallint('total').notNull(),
    status: scoreStatusEnum('status').notNull().default('draft'),
    feedback: text('feedback'),
    /** Required, with an audit entry, when a final score is corrected (brief §10). */
    correctionReason: text('correction_reason'),
    scoredBy: text('scored_by').references(() => user.id, { onDelete: 'set null' }),
    finalisedAt: tstz('finalised_at'),
    ...timestamps,
  },
  (table) => [index('session_scores_session_idx').on(table.sessionId)],
)

export type SessionRow = typeof sessions.$inferSelect
export type NewSessionRow = typeof sessions.$inferInsert
export type RsvpRow = typeof rsvps.$inferSelect
export type AttendanceRow = typeof attendance.$inferSelect
export type SessionScoreRow = typeof sessionScores.$inferSelect
