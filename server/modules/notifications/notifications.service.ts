import { db } from '@server/db/connection'
import { notifications } from '@server/db/schema'

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
 * Retrying with the same `eventId` creates nothing new, so actions can be retried safely.
 * Returns how many rows were actually created. Shared seam: other modules call this; the
 * notifications module owns it.
 */
export async function notify(input: NotifyInput, executor: Executor = db): Promise<number> {
  if (input.recipientIds.length === 0) return 0
  const rows = input.recipientIds.flatMap((recipientId) =>
    (['in_app', 'email'] as const).map((channel) => ({
      eventId: input.eventId,
      kind: input.kind,
      recipientId,
      channel,
      state: 'simulated' as const,
      subject: input.subject,
      body: input.body,
      sessionId: input.sessionId ?? null,
      actorId: input.actorId ?? null,
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
