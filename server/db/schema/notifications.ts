import { NOTIFICATION_CHANNELS, NOTIFICATION_STATES } from '@shared/constants'
import { index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { timestamps, tstz } from './columns'
import { sessions } from './sessions'

export const notificationChannelEnum = pgEnum('notification_channel', NOTIFICATION_CHANNELS)
export const notificationStateEnum = pgEnum('notification_state', NOTIFICATION_STATES)

/**
 * In-app notifications and demo emails. The same `event_id` is on every notification an event
 * creates; (event_id, recipient, channel) is unique, so retrying an action cannot duplicate
 * messages. Emails are SIMULATED unless a provider confirms `sent`.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: text('event_id').notNull(),
    /** session_rescheduled | session_cancelled | assignment_returned | … */
    kind: text('kind').notNull(),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    state: notificationStateEnum('state').notNull().default('simulated'),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    /** Who triggered the event. */
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    failureReason: text('failure_reason'),
    readAt: tstz('read_at'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('notifications_dedupe_uq').on(table.eventId, table.recipientId, table.channel),
    index('notifications_recipient_idx').on(table.recipientId, table.createdAt),
    index('notifications_event_idx').on(table.eventId),
  ],
)

export type NotificationRow = typeof notifications.$inferSelect
