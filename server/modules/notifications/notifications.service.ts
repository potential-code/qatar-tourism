import { db } from '@server/db/connection'
import { notifications, profiles, sessions, user } from '@server/db/schema'
import { now } from '@server/lib/clock'
import type { NotificationLogFilter } from '@shared/schemas/trainer-ops'
import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm'

/** Anything that can run an insert: the pooled db or a transaction. */
type Executor = Pick<typeof db, 'insert'>

export type NotifyInput = {
  /** Same id for every notification one event creates; the (event, recipient, channel) dedupe key. */
  eventId: string
  kind: string
  recipientIds: string[]
  subject: string
  body: string
  sessionId?: string | null
  actorId?: string | null
}

/**
 * Creates one in-app notification and one SIMULATED demo email per recipient (brief §10–11).
 * In-app messages are delivered by this system, so they are `sent`; emails stay `simulated`
 * because no provider is connected (never described as delivered).
 * Retrying with the same `eventId` creates nothing new, so actions can be retried safely.
 * Returns how many rows were actually created. Shared seam: other modules call this.
 */
export async function notify(input: NotifyInput, executor: Executor = db): Promise<number> {
  if (input.recipientIds.length === 0) return 0
  const rows = input.recipientIds.flatMap((recipientId) =>
    (['in_app', 'email'] as const).map((channel) => ({
      eventId: input.eventId,
      kind: input.kind,
      recipientId,
      channel,
      state: channel === 'in_app' ? ('sent' as const) : ('simulated' as const),
      subject: input.subject,
      body: input.body,
      sessionId: input.sessionId ?? null,
      actorId: input.actorId ?? null,
      createdAt: now(),
      updatedAt: now(),
    })),
  )
  const created = await executor
    .insert(notifications)
    .values(rows)
    .onConflictDoNothing({
      target: [notifications.eventId, notifications.recipientId, notifications.channel],
    })
    .returning({ id: notifications.id })
  return created.length
}

/**
 * Personalised variant: one message per recipient (merge fields such as the first name differ).
 * Same dedupe guarantees as `notify`. Returns the number of recipients newly notified in-app.
 */
export async function notifyEach(
  base: Omit<NotifyInput, 'recipientIds' | 'subject' | 'body'>,
  messages: { recipientId: string; subject: string; body: string }[],
  executor: Executor = db,
): Promise<number> {
  let created = 0
  for (const message of messages) {
    const rows = await notify(
      {
        ...base,
        recipientIds: [message.recipientId],
        subject: message.subject,
        body: message.body,
      },
      executor,
    )
    if (rows > 0) created += 1
  }
  return created
}

/** The bell: the viewer's own in-app notifications, newest first. */
export async function listMine(userId: string, limit = 20) {
  const mine = and(eq(notifications.recipientId, userId), eq(notifications.channel, 'in_app'))
  const [items, unread] = await Promise.all([
    db
      .select({
        id: notifications.id,
        eventId: notifications.eventId,
        kind: notifications.kind,
        subject: notifications.subject,
        body: notifications.body,
        state: notifications.state,
        sessionId: notifications.sessionId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(mine)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit),
    db
      .select({ total: count() })
      .from(notifications)
      .where(and(mine, isNull(notifications.readAt))),
  ])
  return { items, unread: unread[0]?.total ?? 0 }
}

/** Marks the viewer's own notifications read. Someone else's id simply matches nothing. */
export async function markRead(userId: string, ids: string[] | 'all') {
  const where = and(
    eq(notifications.recipientId, userId),
    isNull(notifications.readAt),
    ids === 'all' ? undefined : inArray(notifications.id, ids),
  )
  const updated = await db
    .update(notifications)
    .set({ readAt: now() })
    .where(where)
    .returning({ id: notifications.id })
  return { updated: updated.length }
}

/**
 * Notification log (brief §11): both channels with their delivery state. A trainer sees the
 * messages for their own sessions only; `trainerId` null means Academy-wide (admin).
 * Recipients are shown by learner ID and permitted display name, never by email address.
 */
export async function listLog(
  trainerId: string | null,
  filter: NotificationLogFilter,
  limit = 200,
) {
  const conditions: (SQL | undefined)[] = [
    trainerId ? eq(sessions.trainerId, trainerId) : undefined,
    filter.sessionId ? eq(notifications.sessionId, filter.sessionId) : undefined,
    filter.eventId ? eq(notifications.eventId, filter.eventId) : undefined,
    filter.channel ? eq(notifications.channel, filter.channel) : undefined,
  ]
  const rows = await db
    .select({
      id: notifications.id,
      eventId: notifications.eventId,
      kind: notifications.kind,
      channel: notifications.channel,
      state: notifications.state,
      subject: notifications.subject,
      body: notifications.body,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      sessionId: notifications.sessionId,
      sessionCode: sessions.code,
      sessionTitle: sessions.title,
      learnerCode: profiles.learnerCode,
      recipientName: user.name,
    })
    .from(notifications)
    .innerJoin(sessions, eq(sessions.id, notifications.sessionId))
    .innerJoin(user, eq(user.id, notifications.recipientId))
    .leftJoin(profiles, eq(profiles.userId, notifications.recipientId))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt), notifications.eventId, profiles.learnerCode)
    .limit(limit)
  return rows
}
