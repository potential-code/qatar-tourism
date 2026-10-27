import { db } from '@server/db/connection'
import { programmes, rsvps, sessions, trainerProfiles } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { and, eq, inArray, ne, notInArray, type SQL, sql } from 'drizzle-orm'

/**
 * Session reads and row locks shared by the sessions, rsvps, attendance and exports modules.
 * Only services import this file.
 */

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type Reader = typeof db | Tx

export const ACTIVE_RSVP = ['confirmed', 'waitlisted'] as const

/** One session with its trainer, programme and live seat counts. */
export async function selectSessionCards(where: SQL | undefined, executor: Reader = db) {
  return executor
    .select({
      session: sessions,
      trainerName: trainerProfiles.fullName,
      trainerCode: trainerProfiles.code,
      trainerHeadline: trainerProfiles.headline,
      trainerAvatar: trainerProfiles.avatarPath,
      trainerUserId: trainerProfiles.userId,
      programmeCode: programmes.code,
      programmeTitle: programmes.title,
      confirmed:
        sql<number>`count(${rsvps.id}) filter (where ${rsvps.status} = 'confirmed')`.mapWith(
          Number,
        ),
      waitlisted:
        sql<number>`count(${rsvps.id}) filter (where ${rsvps.status} = 'waitlisted')`.mapWith(
          Number,
        ),
    })
    .from(sessions)
    .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
    .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
    .leftJoin(rsvps, eq(rsvps.sessionId, sessions.id))
    .where(where)
    .groupBy(sessions.id, trainerProfiles.id, programmes.id)
    .orderBy(sessions.startsAt)
}

export type SessionCard = Awaited<ReturnType<typeof selectSessionCards>>[number]

export async function getSessionCard(id: string, executor: Reader = db): Promise<SessionCard> {
  const [card] = await selectSessionCards(eq(sessions.id, id), executor)
  if (!card) throw HttpError.notFound('Session not found')
  return card
}

/**
 * Takes the session row lock. Every seat change happens inside a transaction that holds it,
 * so two learners cannot both take the last seat.
 */
export async function lockSession(tx: Tx, id: string) {
  const [row] = await tx.select().from(sessions).where(eq(sessions.id, id)).for('update')
  if (!row) throw HttpError.notFound('Session not found')
  return row
}

export async function countActive(executor: Reader, sessionId: string) {
  const [row] = await executor
    .select({
      confirmed: sql<number>`count(*) filter (where ${rsvps.status} = 'confirmed')`.mapWith(Number),
      waitlisted: sql<number>`count(*) filter (where ${rsvps.status} = 'waitlisted')`.mapWith(
        Number,
      ),
    })
    .from(rsvps)
    .where(eq(rsvps.sessionId, sessionId))
  return { confirmed: row?.confirmed ?? 0, waitlisted: row?.waitlisted ?? 0 }
}

/** Published and Full follow the seat count. Draft, Completed and Cancelled never change here. */
export async function syncCapacityStatus(tx: Tx, sessionId: string) {
  const session = await lockSession(tx, sessionId)
  if (session.status !== 'published' && session.status !== 'full') return session.status
  const { confirmed } = await countActive(tx, sessionId)
  const next = confirmed >= session.capacity ? 'full' : 'published'
  if (next !== session.status) {
    await tx.update(sessions).set({ status: next }).where(eq(sessions.id, sessionId))
  }
  return next
}

/** A trainer's other sessions overlapping [start, end), cancelled ones excluded. */
export async function trainerOverlaps(
  executor: Reader,
  trainerId: string,
  start: Date,
  end: Date,
  excludeSessionId?: string,
) {
  return executor
    .select({ id: sessions.id, code: sessions.code, title: sessions.title })
    .from(sessions)
    .where(
      and(
        eq(sessions.trainerId, trainerId),
        ne(sessions.status, 'cancelled'),
        excludeSessionId ? ne(sessions.id, excludeSessionId) : undefined,
        sql`${sessions.startsAt} < ${end.toISOString()}`,
        sql`${sessions.endsAt} > ${start.toISOString()}`,
      ),
    )
}

/** Active bookings of the given learners that overlap [start, end), excluding one session. */
export async function learnerOverlaps(
  executor: Reader,
  learnerIds: string[],
  start: Date,
  end: Date,
  excludeSessionId: string,
) {
  if (learnerIds.length === 0) return []
  return executor
    .select({ learnerId: rsvps.learnerId, sessionCode: sessions.code })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .where(
      and(
        inArray(rsvps.learnerId, learnerIds),
        inArray(rsvps.status, [...ACTIVE_RSVP]),
        ne(sessions.id, excludeSessionId),
        notInArray(sessions.status, ['cancelled']),
        sql`${sessions.startsAt} < ${end.toISOString()}`,
        sql`${sessions.endsAt} > ${start.toISOString()}`,
      ),
    )
}
