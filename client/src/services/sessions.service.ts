import { type ProgrammeCode, SESSION_STATUSES, type SessionStatus } from '@shared/constants'
import { isoInstant } from '@shared/schemas/common'
import { sessionCancelInput, sessionRescheduleInput } from '@shared/schemas/session'
import {
  type SessionUpdateInput,
  sessionCreateWithPublishInput,
  sessionUpdateInput,
} from '@shared/schemas/trainer-ops'
import type { SessionRow } from '@shared/types/db'
import { z } from 'zod'
import {
  ApiError,
  assertSessionInScope,
  commit,
  currentScope,
  db,
  delay,
  insertRow,
  now,
  out,
  parseInput,
  requireRole,
  type Scope,
  updateRow,
} from './api'
import { recordAudit } from './audit.service'
import * as changes from './sessions/changes'
import { outstandingAttendanceBySession } from './sessions/outstanding'
import * as overviewModule from './sessions/overview'
import { assertCanCreate, assertEditAllowed } from './sessions/policy'
import {
  countActive,
  findSession,
  getSessionCard,
  ms,
  selectSessionCards,
  syncCapacityStatus,
  trainerOverlaps,
} from './sessions/store'
import { toSessionView } from './sessions/view'

/**
 * The trainer workspace's sessions (brief §10, formerly the /api/sessions module). Every call
 * resolves the viewer's scope and checks each session id against it, so Trainer 1 gets a 403
 * for Trainer 2's session whatever id the URL carries. Admins manage every session.
 */

export type { SessionView } from './sessions/view'

const DEFAULT_PREREQUISITE_A = 'a_level1_complete'
const idInput = z.uuid()

/** Trainer or admin, with their scope. */
function managerScope(): { viewer: ReturnType<typeof requireRole>; scope: Scope } {
  const viewer = requireRole('trainer', 'admin')
  return { viewer, scope: currentScope() }
}

/** Trainer only (overview, profile, resources). */
function trainerScope(): Scope {
  requireRole('trainer')
  return currentScope()
}

const parseId = (id: string) => parseInput(idInput, id, 'param')

/** My sessions (trainer) or every session (admin), with live counts and outstanding marking. */
export async function listSessions(status?: SessionStatus) {
  await delay()
  const { scope } = managerScope()
  const wanted = status ? parseInput(z.enum(SESSION_STATUSES), status, 'query') : undefined
  const cards = selectSessionCards(
    (s) =>
      (scope.kind !== 'trainer' || s.trainerId === scope.trainerId) &&
      (!wanted || s.status === wanted),
  )
  const outstanding = outstandingAttendanceBySession(cards.map((card) => card.session.id))
  return out({
    now: now().toISOString(),
    items: cards.map((card) => ({
      ...toSessionView(card),
      attendanceOutstanding: outstanding.get(card.session.id) ?? 0,
    })),
  })
}

export async function getSessionDetail(id: string) {
  await delay()
  const { scope } = managerScope()
  parseId(id)
  assertSessionInScope(scope, id)
  const card = getSessionCard(id)
  const history = db.sessionReschedules
    .filter((r) => r.sessionId === id)
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
  const iso = (value: string) => new Date(value).toISOString()
  return out({
    now: now().toISOString(),
    session: toSessionView(card),
    rescheduleHistory: history.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      previousStartsAt: iso(row.previousStartsAt),
      previousEndsAt: iso(row.previousEndsAt),
      newStartsAt: iso(row.newStartsAt),
      newEndsAt: iso(row.newEndsAt),
      previousVenue: row.previousVenue,
      newVenue: row.newVenue,
      reason: row.reason,
      affectedRsvps: row.affectedRsvps,
      at: iso(row.createdAt),
    })),
  })
}

/** Programmes and trainers the viewer may pick in the session form. */
export async function getFormOptions() {
  await delay()
  const { scope } = managerScope()
  const approved =
    scope.kind === 'trainer'
      ? new Set(
          db.trainerProgrammes
            .filter((t) => t.trainerId === scope.trainerId)
            .map((t) => t.programmeId),
        )
      : null
  const programmes = db.programmes
    .filter((p) => !approved || approved.has(p.id))
    .map((p) => ({ id: p.id, code: p.code, title: p.title }))
    .sort((a, b) => a.code.localeCompare(b.code))
  const trainers = db.trainerProfiles
    .filter((t) => scope.kind !== 'trainer' || t.id === scope.trainerId)
    .map((t) => ({ id: t.id, code: t.code, name: t.fullName }))
    .sort((a, b) => a.code.localeCompare(b.code))
  return out({
    programmes,
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
  })
}

function programmeCodeOf(programmeId: string): ProgrammeCode {
  const programme = db.programmes.find((p) => p.id === programmeId)
  if (!programme) throw ApiError.badRequest('Unknown programme')
  return programme.code
}

/** Gate and prerequisite follow the programme: A sessions are required; B and C are optional. */
function derivedFields(code: ProgrammeCode, input: SessionUpdateInput) {
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
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: new Date(input.endsAt).toISOString(),
    timezone: 'Asia/Qatar',
    capacity: input.capacity,
    venue: inPerson ? (input.venue ?? null) : null,
    room: inPerson ? (input.room ?? null) : null,
    accessNote: inPerson ? (input.accessNote ?? null) : null,
    meetingRef: inPerson ? null : (input.meetingRef ?? null),
    joinInstructions: inPerson ? null : (input.joinInstructions ?? null),
    bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline).toISOString() : null,
    cancellationPolicy: input.cancellationPolicy,
    description: input.description,
    materials: input.materials,
  } satisfies Partial<SessionRow>
}

function assertNoTrainerConflict(
  trainerId: string,
  start: string,
  end: string,
  excludeId?: string,
) {
  const clashes = trainerOverlaps(trainerId, new Date(start), new Date(end), excludeId)
  if (clashes.length > 0) {
    throw ApiError.conflict(
      'SCHEDULE_CONFLICT',
      `This time overlaps ${clashes.map((c) => `${c.title} (${c.code})`).join(', ')}.`,
      { conflicts: clashes },
    )
  }
}

function nextCode(trainerId: string): string {
  const trainer = db.trainerProfiles.find((t) => t.id === trainerId)
  if (!trainer) throw ApiError.badRequest('Unknown trainer')
  const prefix = `SES-${trainer.code}-`
  const max = db.sessions
    .filter((s) => s.code.startsWith(prefix))
    .reduce((m, s) => Math.max(m, Number(s.code.split('-').pop()) || 0), 0)
  return `${prefix}${max + 1}`
}

export async function createSession(input: { session: SessionUpdateInput; publish?: boolean }) {
  await delay()
  const { viewer, scope } = managerScope()
  const { session, publish } = parseInput(sessionCreateWithPublishInput, input)
  assertCanCreate(scope, session)
  const columns = columnsFrom(session)
  if (ms(columns.startsAt) <= now().getTime()) {
    throw ApiError.badRequest('Choose a start time in the future.')
  }
  assertNoTrainerConflict(session.trainerId, columns.startsAt, columns.endsAt)
  const code = programmeCodeOf(session.programmeId)
  const sessionCode = nextCode(session.trainerId)

  const row = insertRow('sessions', {
    ...columns,
    ...derivedFields(code, session),
    code: sessionCode,
    status: publish ? 'published' : 'draft',
    cancelledReason: null,
    createdBy: viewer.id,
  })
  recordAudit(viewer, {
    action: publish ? 'session.publish' : 'session.create',
    objectType: 'session',
    objectId: row.id,
    after: { code: row.code, status: row.status, startsAt: row.startsAt },
  })
  commit()
  return out({ id: row.id, code: row.code, status: row.status })
}

export async function updateSession(id: string, input: SessionUpdateInput) {
  await delay()
  const { viewer, scope } = managerScope()
  parseId(id)
  const next = parseInput(sessionUpdateInput, input)
  assertSessionInScope(scope, id)
  const current = findSession(id)
  assertEditAllowed(scope, current, next)
  if (current.status === 'cancelled' || current.status === 'completed') {
    throw ApiError.conflict('SESSION_CLOSED', 'Cancelled and completed sessions cannot be edited.')
  }
  const columns = columnsFrom(next)
  const { confirmed, waitlisted } = countActive(id)
  const timeChanged =
    ms(columns.startsAt) !== ms(current.startsAt) || ms(columns.endsAt) !== ms(current.endsAt)
  if (timeChanged && confirmed + waitlisted > 0) {
    throw ApiError.conflict(
      'USE_RESCHEDULE',
      'This session has bookings. Use Reschedule so every learner is notified.',
    )
  }
  if (columns.format !== current.format && confirmed + waitlisted > 0) {
    throw ApiError.conflict(
      'FORMAT_LOCKED',
      'The format cannot change once learners have booked. Cancel and create a new session instead.',
    )
  }
  if (timeChanged && ms(columns.startsAt) <= now().getTime()) {
    throw ApiError.badRequest('Choose a start time in the future.')
  }
  if (columns.capacity < confirmed) {
    throw ApiError.badRequest(
      `Capacity cannot be below the ${confirmed} confirmed learners already booked.`,
    )
  }
  if (timeChanged) assertNoTrainerConflict(next.trainerId, columns.startsAt, columns.endsAt, id)
  const code = programmeCodeOf(next.programmeId)

  const before = { title: current.title, capacity: current.capacity, venue: current.venue }
  updateRow(current, { ...columns, ...derivedFields(code, next) })
  syncCapacityStatus(id)
  recordAudit(viewer, {
    action: 'session.update',
    objectType: 'session',
    objectId: id,
    before,
    after: { title: next.title, capacity: next.capacity, venue: columns.venue },
  })
  commit()
  return out({ id, code: current.code })
}

export async function publishSession(id: string) {
  await delay()
  const { viewer, scope } = managerScope()
  parseId(id)
  assertSessionInScope(scope, id)
  const current = findSession(id)
  if (current.status !== 'draft') {
    throw ApiError.conflict('NOT_DRAFT', 'Only a draft session can be published.')
  }
  if (ms(current.startsAt) <= now().getTime()) {
    throw ApiError.badRequest('This session starts in the past. Change the time first.')
  }
  assertNoTrainerConflict(current.trainerId, current.startsAt, current.endsAt, id)
  updateRow(current, { status: 'published' })
  syncCapacityStatus(id)
  recordAudit(viewer, {
    action: 'session.publish',
    objectType: 'session',
    objectId: id,
    before: { status: 'draft' },
    after: { status: 'published' },
  })
  commit()
  return { id, status: 'published' as const }
}

/** Closes a session that has taken place. Completion of learners comes from attendance and scores. */
export async function completeSession(id: string) {
  await delay()
  const { viewer, scope } = managerScope()
  parseId(id)
  assertSessionInScope(scope, id)
  const current = findSession(id)
  if (current.status !== 'published' && current.status !== 'full') {
    throw ApiError.conflict('NOT_OPEN', 'Only a published or full session can be completed.')
  }
  if (ms(current.startsAt) > now().getTime()) {
    throw ApiError.conflict('NOT_STARTED', 'A session can be completed once it has started.')
  }
  const previous = current.status
  updateRow(current, { status: 'completed' })
  recordAudit(viewer, {
    action: 'session.complete',
    objectType: 'session',
    objectId: id,
    before: { status: previous },
    after: { status: 'completed' },
  })
  commit()
  return { id, status: 'completed' as const }
}

const impactQuery = z.object({ startsAt: isoInstant.optional(), endsAt: isoInstant.optional() })

/** Who a reschedule or cancellation would reach, and who would clash with a proposed time. */
export async function getImpact(id: string, proposed: { startsAt?: string; endsAt?: string } = {}) {
  await delay()
  const { scope } = managerScope()
  parseId(id)
  const query = parseInput(impactQuery, proposed, 'query')
  return out(changes.impact(scope, id, query))
}

export type RescheduleInput = z.input<typeof sessionRescheduleInput>

export async function rescheduleSession(id: string, input: RescheduleInput) {
  await delay()
  const { viewer, scope } = managerScope()
  parseId(id)
  const body = parseInput(sessionRescheduleInput, input)
  const result = changes.reschedule(viewer, scope, id, body)
  commit()
  return out(result)
}

export async function cancelSession(id: string, input: { reason: string; idempotencyKey: string }) {
  await delay()
  const { viewer, scope } = managerScope()
  parseId(id)
  const body = parseInput(sessionCancelInput, input)
  const result = changes.cancelSession(viewer, scope, id, body)
  commit()
  return out(result)
}

/** Trainer Overview (brief §10). */
export async function getOverview() {
  await delay()
  return out(overviewModule.trainerOverview(trainerScope()))
}

/** The trainer's own profile and approved programmes. */
export async function getTrainerProfile() {
  await delay()
  return out(overviewModule.trainerProfile(trainerScope()))
}

/** Materials across the trainer's own sessions. */
export async function getTrainerResources() {
  await delay()
  return out(overviewModule.trainerResources(trainerScope()))
}
