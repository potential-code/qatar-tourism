import { db } from '@server/db/connection'
import {
  attendance,
  programmes,
  rsvps,
  sessionReschedules,
  sessions,
  trainerProfiles,
  trainerProgrammes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { assertSessionInScope, type Scope } from '@server/middleware/scope.middleware'
import type { SessionStatus } from '@shared/constants'
import type { SessionUpdateInput } from '@shared/schemas/trainer-ops'
import { and, desc, eq, inArray, like, lte, ne, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import type { Actor } from './actor'
import {
  countActive,
  getSessionCard,
  lockSession,
  type Reader,
  selectSessionCards,
  syncCapacityStatus,
  trainerOverlaps,
} from './session-store'
import { toSessionView } from './session-view'
import { assertCanCreate, assertEditAllowed } from './sessions.policy'

const DEFAULT_PREREQUISITE_A = 'a_level1_complete'

const scopeFilter = (scope: Scope) =>
  scope.kind === 'trainer' ? eq(sessions.trainerId, scope.trainerId) : undefined

/** My sessions (trainer) or every session (admin), with live counts and outstanding marking. */
export async function listSessions(scope: Scope, status?: SessionStatus) {
  const cards = await selectSessionCards(
    and(scopeFilter(scope), status ? eq(sessions.status, status) : undefined),
  )
  const ids = cards.map((card) => card.session.id)
  const outstanding = await outstandingAttendanceBySession(ids)
  const at = now()
  return {
    now: at.toISOString(),
    items: cards.map((card) => ({
      ...toSessionView(card),
      attendanceOutstanding: outstanding.get(card.session.id) ?? 0,
    })),
  }
}

/** Confirmed RSVPs on sessions that have started and have no attendance (or pending). */
export async function outstandingAttendanceBySession(sessionIds: string[], executor: Reader = db) {
  if (sessionIds.length === 0) return new Map<string, number>()
  const rows = await executor
    .select({ sessionId: rsvps.sessionId, total: sql<number>`count(*)`.mapWith(Number) })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
    .where(
      and(
        inArray(rsvps.sessionId, sessionIds),
        eq(rsvps.status, 'confirmed'),
        ne(sessions.status, 'cancelled'),
        lte(sessions.startsAt, now()),
        sql`(${attendance.id} is null or ${attendance.status} = 'pending')`,
      ),
    )
    .groupBy(rsvps.sessionId)
  return new Map(rows.map((row) => [row.sessionId, row.total]))
}

export async function sessionDetail(scope: Scope, id: string) {
  await assertSessionInScope(scope, id)
  const [card, history] = await Promise.all([
    getSessionCard(id),
    db
      .select()
      .from(sessionReschedules)
      .where(eq(sessionReschedules.sessionId, id))
      .orderBy(desc(sessionReschedules.createdAt)),
  ])
  return {
    now: now().toISOString(),
    session: toSessionView(card),
    rescheduleHistory: history.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      previousStartsAt: row.previousStartsAt.toISOString(),
      previousEndsAt: row.previousEndsAt.toISOString(),
      newStartsAt: row.newStartsAt.toISOString(),
      newEndsAt: row.newEndsAt.toISOString(),
      previousVenue: row.previousVenue,
      newVenue: row.newVenue,
      reason: row.reason,
      affectedRsvps: row.affectedRsvps,
      at: row.createdAt.toISOString(),
    })),
  }
}

/** Programmes and trainers the viewer may pick in the session form. */
export async function formOptions(scope: Scope) {
  const programmeRows =
    scope.kind === 'trainer'
      ? await db
          .select({ id: programmes.id, code: programmes.code, title: programmes.title })
          .from(trainerProgrammes)
          .innerJoin(programmes, eq(programmes.id, trainerProgrammes.programmeId))
          .where(eq(trainerProgrammes.trainerId, scope.trainerId))
      : await db
          .select({ id: programmes.id, code: programmes.code, title: programmes.title })
          .from(programmes)
  const trainers = await db
    .select({ id: trainerProfiles.id, code: trainerProfiles.code, name: trainerProfiles.fullName })
    .from(trainerProfiles)
    .where(scope.kind === 'trainer' ? eq(trainerProfiles.id, scope.trainerId) : undefined)
    .orderBy(trainerProfiles.code)
  return {
    programmes: programmeRows.sort((a, b) => a.code.localeCompare(b.code)),
    trainers,
    prerequisites: [
      { value: 'a_level1_complete', label: 'Program A Level 1 complete' },
      { value: 'none', label: 'No prerequisite (optional session)' },
    ],
    defaults: {
      timezone: 'Asia/Qatar',
      cancellationPolicy:
        'Self-service changes until 24 hours before the session. Later changes request admin review.',
    },
  }
}

async function programmeCodeOf(executor: Reader, programmeId: string) {
  const [row] = await executor
    .select({ code: programmes.code })
    .from(programmes)
    .where(eq(programmes.id, programmeId))
  if (!row) throw HttpError.badRequest('Unknown programme')
  return row.code
}

/** Gate and prerequisite follow the programme: A sessions are required; B and C are optional. */
function derivedFields(code: 'A' | 'B' | 'C', input: SessionUpdateInput) {
  const prerequisite =
    input.prerequisite === 'none' || input.prerequisite === ''
      ? null
      : (input.prerequisite ?? (code === 'A' ? DEFAULT_PREREQUISITE_A : null))
  return {
    isCompletionGate: code === 'A',
    prerequisite: code === 'A' ? prerequisite : null,
    level: code === 'A' ? (input.level ?? 'Level 2') : null,
    stage: code === 'A' ? (input.stage ?? 'Trainer-led application') : null,
  }
}

function columnsFrom(input: SessionUpdateInput) {
  const inPerson = input.format === 'in_person'
  return {
    title: input.title,
    programmeId: input.programmeId,
    trainerId: input.trainerId,
    format: input.format,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    timezone: 'Asia/Qatar',
    capacity: input.capacity,
    venue: inPerson ? (input.venue ?? null) : null,
    room: inPerson ? (input.room ?? null) : null,
    accessNote: inPerson ? (input.accessNote ?? null) : null,
    meetingRef: inPerson ? null : (input.meetingRef ?? null),
    joinInstructions: inPerson ? null : (input.joinInstructions ?? null),
    bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline) : null,
    cancellationPolicy: input.cancellationPolicy,
    description: input.description,
    materials: input.materials,
  }
}

async function assertNoTrainerConflict(
  executor: Reader,
  trainerId: string,
  start: Date,
  end: Date,
  excludeId?: string,
) {
  const clashes = await trainerOverlaps(executor, trainerId, start, end, excludeId)
  if (clashes.length > 0) {
    throw new HttpError(
      409,
      'SCHEDULE_CONFLICT',
      `This time overlaps ${clashes.map((c) => `${c.title} (${c.code})`).join(', ')}.`,
      { conflicts: clashes },
    )
  }
}

async function nextCode(executor: Reader, trainerId: string) {
  const [trainer] = await executor
    .select({ code: trainerProfiles.code })
    .from(trainerProfiles)
    .where(eq(trainerProfiles.id, trainerId))
  if (!trainer) throw HttpError.badRequest('Unknown trainer')
  const existing = await executor
    .select({ code: sessions.code })
    .from(sessions)
    .where(like(sessions.code, `SES-${trainer.code}-%`))
  const max = existing.reduce((m, row) => Math.max(m, Number(row.code.split('-').pop()) || 0), 0)
  return `SES-${trainer.code}-${max + 1}`
}

export async function createSession(
  actor: Actor,
  scope: Scope,
  input: SessionUpdateInput,
  publish: boolean,
) {
  await assertCanCreate(scope, input)
  const columns = columnsFrom(input)
  if (columns.startsAt <= now()) throw HttpError.badRequest('Choose a start time in the future.')

  const created = await db.transaction(async (tx) => {
    await assertNoTrainerConflict(tx, input.trainerId, columns.startsAt, columns.endsAt)
    const code = await programmeCodeOf(tx, input.programmeId)
    const [row] = await tx
      .insert(sessions)
      .values({
        ...columns,
        ...derivedFields(code, input),
        code: await nextCode(tx, input.trainerId),
        status: publish ? 'published' : 'draft',
        createdBy: actor.id,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
    if (!row) throw new Error('Session insert returned nothing')
    await recordAudit(
      actor,
      {
        action: publish ? 'session.publish' : 'session.create',
        objectType: 'session',
        objectId: row.id,
        after: { code: row.code, status: row.status, startsAt: row.startsAt.toISOString() },
      },
      tx,
      actor.requestId,
    )
    return row
  })
  return { id: created.id, code: created.code, status: created.status }
}

export async function updateSession(
  actor: Actor,
  scope: Scope,
  id: string,
  input: SessionUpdateInput,
) {
  await assertSessionInScope(scope, id)
  return db.transaction(async (tx) => {
    const current = await lockSession(tx, id)
    assertEditAllowed(scope, current, input)
    if (current.status === 'cancelled' || current.status === 'completed') {
      throw new HttpError(
        409,
        'SESSION_CLOSED',
        'Cancelled and completed sessions cannot be edited.',
      )
    }
    const columns = columnsFrom(input)
    const { confirmed, waitlisted } = await countActive(tx, id)
    const timeChanged =
      columns.startsAt.getTime() !== current.startsAt.getTime() ||
      columns.endsAt.getTime() !== current.endsAt.getTime()
    if (timeChanged && confirmed + waitlisted > 0) {
      throw new HttpError(
        409,
        'USE_RESCHEDULE',
        'This session has bookings. Use Reschedule so every learner is notified.',
      )
    }
    if (columns.format !== current.format && confirmed + waitlisted > 0) {
      throw new HttpError(
        409,
        'FORMAT_LOCKED',
        'The format cannot change once learners have booked. Cancel and create a new session instead.',
      )
    }
    if (timeChanged && columns.startsAt <= now()) {
      throw HttpError.badRequest('Choose a start time in the future.')
    }
    if (columns.capacity < confirmed) {
      throw HttpError.badRequest(
        `Capacity cannot be below the ${confirmed} confirmed learners already booked.`,
      )
    }
    if (timeChanged) {
      await assertNoTrainerConflict(tx, input.trainerId, columns.startsAt, columns.endsAt, id)
    }
    const code = await programmeCodeOf(tx, input.programmeId)
    await tx
      .update(sessions)
      .set({ ...columns, ...derivedFields(code, input), updatedAt: now() })
      .where(eq(sessions.id, id))
    await syncCapacityStatus(tx, id)
    await recordAudit(
      actor,
      {
        action: 'session.update',
        objectType: 'session',
        objectId: id,
        before: { title: current.title, capacity: current.capacity, venue: current.venue },
        after: { title: input.title, capacity: input.capacity, venue: columns.venue },
      },
      tx,
      actor.requestId,
    )
    return { id, code: current.code }
  })
}

export async function publishSession(actor: Actor, scope: Scope, id: string) {
  await assertSessionInScope(scope, id)
  return db.transaction(async (tx) => {
    const current = await lockSession(tx, id)
    if (current.status !== 'draft') {
      throw new HttpError(409, 'NOT_DRAFT', 'Only a draft session can be published.')
    }
    if (current.startsAt <= now()) {
      throw HttpError.badRequest('This session starts in the past. Change the time first.')
    }
    await assertNoTrainerConflict(tx, current.trainerId, current.startsAt, current.endsAt, id)
    await tx
      .update(sessions)
      .set({ status: 'published', updatedAt: now() })
      .where(eq(sessions.id, id))
    await syncCapacityStatus(tx, id)
    await recordAudit(
      actor,
      {
        action: 'session.publish',
        objectType: 'session',
        objectId: id,
        before: { status: 'draft' },
        after: { status: 'published' },
      },
      tx,
      actor.requestId,
    )
    return { id, status: 'published' as const }
  })
}

/** Closes a session that has taken place. Completion of learners comes from attendance and scores. */
export async function completeSession(actor: Actor, scope: Scope, id: string) {
  await assertSessionInScope(scope, id)
  return db.transaction(async (tx) => {
    const current = await lockSession(tx, id)
    if (current.status !== 'published' && current.status !== 'full') {
      throw new HttpError(409, 'NOT_OPEN', 'Only a published or full session can be completed.')
    }
    if (current.startsAt > now()) {
      throw new HttpError(409, 'NOT_STARTED', 'A session can be completed once it has started.')
    }
    await tx
      .update(sessions)
      .set({ status: 'completed', updatedAt: now() })
      .where(eq(sessions.id, id))
    await recordAudit(
      actor,
      {
        action: 'session.complete',
        objectType: 'session',
        objectId: id,
        before: { status: current.status },
        after: { status: 'completed' },
      },
      tx,
      actor.requestId,
    )
    return { id, status: 'completed' as const }
  })
}
