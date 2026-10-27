import { db } from '@server/db/connection'
import { attendance, profiles, rsvps, sessionScores, sessions } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { assertSessionInScope, type Scope } from '@server/middleware/scope.middleware'
import { SESSION_RUBRIC, THRESHOLDS } from '@shared/constants'
import { pickVisibleLearnerFields } from '@shared/permissions'
import type { Role } from '@shared/roles'
import type { SessionScoreInput } from '@shared/schemas/session'
import type { AttendanceUpdateInput } from '@shared/schemas/trainer-ops'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { recomputeEnrolment } from '../progress/progress.service'
import type { Actor } from '../sessions/actor'
import { programmeOf } from '../sessions/session-changes.service'
import { getSessionCard, lockSession, type Tx } from '../sessions/session-store'
import { toSessionView } from '../sessions/session-view'

/**
 * Attendance and scoring (brief §10). Attendance: pending, attended, late, absent, excused.
 * Rubric 20/30/30/20, pass at 70. Absence never becomes a pass; a cancelled session records
 * nothing. A final score updates the learner's programme progress through `recomputeEnrolment`.
 */

const PRESENT = ['attended', 'late'] as const

/** Roster rows: learner ID and permitted display name only (brief §11 field rules). */
export async function roster(scope: Scope, role: Role, sessionId: string) {
  await assertSessionInScope(scope, sessionId)
  const card = await getSessionCard(sessionId)
  const rows = await db
    .select({
      rsvpId: rsvps.id,
      rsvpStatus: rsvps.status,
      waitlistPosition: rsvps.waitlistPosition,
      learnerCode: profiles.learnerCode,
      fullName: profiles.fullName,
      attendance: attendance.status,
      attendanceMarkedAt: attendance.markedAt,
      score: sessionScores,
    })
    .from(rsvps)
    .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
    .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
    .leftJoin(sessionScores, eq(sessionScores.rsvpId, rsvps.id))
    .where(
      and(
        eq(rsvps.sessionId, sessionId),
        inArray(rsvps.status, ['confirmed', 'waitlisted', 'cancelled']),
      ),
    )
    .orderBy(asc(rsvps.status), asc(rsvps.waitlistPosition), asc(profiles.learnerCode))

  const at = now()
  const session = toSessionView(card)
  return {
    now: at.toISOString(),
    session,
    rubric: SESSION_RUBRIC,
    passMark: THRESHOLDS.sessionPass,
    recordingOpen: session.status !== 'cancelled' && session.status !== 'draft',
    /** Demo: marking stays open before the session time so the walkthrough can continue. */
    beforeSessionTime: card.session.startsAt > at,
    items: rows.map((row) => {
      const visible = pickVisibleLearnerFields(role, {
        learnerCode: row.learnerCode ?? 'Unknown',
        displayName: row.fullName ?? 'Learner',
      })
      return {
        rsvpId: row.rsvpId,
        learnerCode: String(visible.learnerCode ?? ''),
        displayName: String(visible.displayName ?? ''),
        rsvpStatus: row.rsvpStatus,
        waitlistPosition: row.waitlistPosition,
        attendance: row.attendance ?? 'pending',
        score: row.score
          ? {
              preparation: row.score.preparation,
              communication: row.score.communication,
              practical: row.score.practical,
              professionalism: row.score.professionalism,
              total: row.score.total,
              status: row.score.status,
              feedback: row.score.feedback,
              passed: row.score.total >= THRESHOLDS.sessionPass,
              finalisedAt: row.score.finalisedAt ? row.score.finalisedAt.toISOString() : null,
            }
          : null,
      }
    }),
  }
}

async function loadRsvp(tx: Tx, scope: Scope, rsvpId: string) {
  const [row] = await tx
    .select({ rsvp: rsvps, sessionStatus: sessions.status })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .where(eq(rsvps.id, rsvpId))
  if (!row) throw HttpError.notFound('Booking not found')
  await assertSessionInScope(scope, row.rsvp.sessionId)
  await lockSession(tx, row.rsvp.sessionId)
  if (row.sessionStatus === 'cancelled') {
    throw new HttpError(
      409,
      'SESSION_CANCELLED',
      'A cancelled session cannot record attendance or scores.',
    )
  }
  if (row.sessionStatus === 'draft') {
    throw new HttpError(409, 'SESSION_DRAFT', 'Publish the session before recording attendance.')
  }
  if (row.rsvp.status !== 'confirmed') {
    throw new HttpError(409, 'NOT_CONFIRMED', 'Only confirmed learners have attendance.')
  }
  return row.rsvp
}

async function refreshProgress(tx: Tx, learnerId: string, sessionId: string) {
  const code = await programmeOf(tx, sessionId)
  if (code) await recomputeEnrolment(learnerId, code, tx)
}

export async function markAttendance(actor: Actor, scope: Scope, input: AttendanceUpdateInput) {
  return db.transaction(async (tx) => {
    const rsvp = await loadRsvp(tx, scope, input.rsvpId)
    const [current] = await tx.select().from(attendance).where(eq(attendance.rsvpId, rsvp.id))
    const [score] = await tx.select().from(sessionScores).where(eq(sessionScores.rsvpId, rsvp.id))
    const previous = current?.status ?? 'pending'
    if (previous === input.status) return { rsvpId: rsvp.id, status: previous, scoreRemoved: false }

    const finalised = score?.status === 'final'
    if (finalised && !input.correctionReason) {
      throw new HttpError(
        400,
        'CORRECTION_REASON_REQUIRED',
        'This learner has a final score. Give a reason for the correction.',
      )
    }

    await tx
      .insert(attendance)
      .values({
        rsvpId: rsvp.id,
        sessionId: rsvp.sessionId,
        learnerId: rsvp.learnerId,
        status: input.status,
        markedBy: actor.id,
        markedAt: now(),
      })
      .onConflictDoUpdate({
        target: attendance.rsvpId,
        set: { status: input.status, markedBy: actor.id, markedAt: now(), updatedAt: now() },
      })

    // Absence never passes: a score cannot stand without attendance.
    const scoreRemoved = Boolean(score) && !PRESENT.includes(input.status as 'attended')
    if (scoreRemoved) await tx.delete(sessionScores).where(eq(sessionScores.rsvpId, rsvp.id))

    await recordAudit(
      actor,
      {
        action: finalised ? 'marking.correct' : 'attendance.mark',
        objectType: 'attendance',
        objectId: rsvp.id,
        before: { attendance: previous, score: score?.total ?? null },
        after: { attendance: input.status, score: scoreRemoved ? null : (score?.total ?? null) },
        reason: input.correctionReason ?? null,
      },
      tx,
      actor.requestId,
    )
    await refreshProgress(tx, rsvp.learnerId, rsvp.sessionId)
    return { rsvpId: rsvp.id, status: input.status, scoreRemoved }
  })
}

export async function recordScore(actor: Actor, scope: Scope, input: SessionScoreInput) {
  return db.transaction(async (tx) => {
    const rsvp = await loadRsvp(tx, scope, input.rsvpId)
    const [present] = await tx
      .select({ status: attendance.status })
      .from(attendance)
      .where(eq(attendance.rsvpId, rsvp.id))
    if (!present || !PRESENT.includes(present.status as 'attended')) {
      throw new HttpError(
        409,
        'ABSENCE_CANNOT_PASS',
        'Mark the learner attended or late before scoring. Absence never counts as a pass.',
      )
    }
    const [existing] = await tx
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.rsvpId, rsvp.id))
    if (existing?.status === 'final') {
      if (input.status === 'draft') {
        throw new HttpError(409, 'ALREADY_FINAL', 'A final score cannot return to draft.')
      }
      if (!input.correctionReason) {
        throw new HttpError(
          400,
          'CORRECTION_REASON_REQUIRED',
          'This score is final. Give a reason for the correction.',
        )
      }
    }

    const total = input.preparation + input.communication + input.practical + input.professionalism
    const values = {
      preparation: input.preparation,
      communication: input.communication,
      practical: input.practical,
      professionalism: input.professionalism,
      total,
      status: input.status,
      feedback: input.feedback ?? null,
      correctionReason: existing?.status === 'final' ? (input.correctionReason ?? null) : null,
      scoredBy: actor.id,
      finalisedAt: input.status === 'final' ? (existing?.finalisedAt ?? now()) : null,
      updatedAt: now(),
    }
    await tx
      .insert(sessionScores)
      .values({ ...values, rsvpId: rsvp.id, sessionId: rsvp.sessionId, learnerId: rsvp.learnerId })
      .onConflictDoUpdate({ target: sessionScores.rsvpId, set: values })

    const correction = existing?.status === 'final'
    await recordAudit(
      actor,
      {
        action: correction
          ? 'marking.correct'
          : input.status === 'final'
            ? 'marking.finalise'
            : 'marking.draft',
        objectType: 'session_score',
        objectId: rsvp.id,
        before: existing ? { total: existing.total, status: existing.status } : null,
        after: { total, status: input.status },
        reason: correction ? (input.correctionReason ?? null) : null,
      },
      tx,
      actor.requestId,
    )
    if (input.status === 'final') await refreshProgress(tx, rsvp.learnerId, rsvp.sessionId)
    return { rsvpId: rsvp.id, total, status: input.status, passed: total >= THRESHOLDS.sessionPass }
  })
}
