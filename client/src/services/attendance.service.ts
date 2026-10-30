import { SESSION_RUBRIC, THRESHOLDS } from '@shared/constants'
import { type SessionScoreInput, sessionScoreInput } from '@shared/schemas/session'
import { type AttendanceUpdateInput, attendanceUpdateInput } from '@shared/schemas/trainer-ops'
import type { RsvpRow } from '@shared/types/db'
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
  nowIso,
  out,
  parseInput,
  pickVisibleLearnerFields,
  requireRole,
  type Scope,
  updateRow,
  type Viewer,
} from './api'
import { recordAudit } from './audit.service'
import { recomputeEnrolment } from './progress.service'
import { settleOffers } from './rsvps/offers'
import { getSessionCard, ms, programmeOf, rsvpStatusRank } from './sessions/store'
import { toSessionView } from './sessions/view'

/**
 * Attendance and scoring (brief §10, formerly the /api/attendance module). Attendance: pending,
 * attended, late, absent, excused. Rubric 20/30/30/20, pass at 70. Absence never becomes a pass;
 * a cancelled session records nothing. A final score updates the learner's programme progress
 * through `recomputeEnrolment`. Trainers act on their own sessions only; admins on all.
 */

const PRESENT: readonly string[] = ['attended', 'late']

/** brief §11 `marking.record`: trainers for assigned sessions, admins to review and administer. */
function markerScope(): { viewer: Viewer; scope: Scope } {
  const viewer = requireRole('trainer', 'admin')
  return { viewer, scope: currentScope() }
}

const iso = (value: string | null) => (value ? new Date(value).toISOString() : null)

/** Roster rows: learner ID and permitted display name only (brief §11 field rules). */
export async function getRoster(sessionId: string) {
  await delay()
  const { viewer, scope } = markerScope()
  parseInput(z.uuid(), sessionId, 'param')
  assertSessionInScope(scope, sessionId)
  if (settleOffers()) commit()
  const card = getSessionCard(sessionId)
  const offers = new Map(
    db.seatOffers.filter((o) => o.status === 'offered').map((o) => [o.rsvpId, o.expiresAt]),
  )
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const attendance = new Map(db.attendance.map((a) => [a.rsvpId, a]))
  const scores = new Map(db.sessionScores.map((s) => [s.rsvpId, s]))
  const rows = db.rsvps
    .filter((r) => r.sessionId === sessionId && r.status !== 'moved')
    .map((r) => ({ rsvp: r, profile: profiles.get(r.learnerId) }))
    .sort(
      (a, b) =>
        rsvpStatusRank(a.rsvp.status) - rsvpStatusRank(b.rsvp.status) ||
        (a.rsvp.waitlistPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.rsvp.waitlistPosition ?? Number.MAX_SAFE_INTEGER) ||
        (a.profile?.learnerCode ?? '').localeCompare(b.profile?.learnerCode ?? ''),
    )

  const at = now()
  const session = toSessionView(card)
  return out({
    now: at.toISOString(),
    session,
    rubric: SESSION_RUBRIC,
    passMark: THRESHOLDS.sessionPass,
    recordingOpen: session.status !== 'cancelled' && session.status !== 'draft',
    /** Demo: marking stays open before the session time so the walkthrough can continue. */
    beforeSessionTime: ms(card.session.startsAt) > at.getTime(),
    items: rows.map(({ rsvp, profile }) => {
      const visible = pickVisibleLearnerFields(viewer.role, {
        learnerCode: profile?.learnerCode ?? 'Unknown',
        displayName: profile?.fullName ?? 'Learner',
      })
      const score = scores.get(rsvp.id)
      return {
        rsvpId: rsvp.id,
        learnerCode: String(visible.learnerCode ?? ''),
        displayName: String(visible.displayName ?? ''),
        rsvpStatus: rsvp.status,
        waitlistPosition: rsvp.waitlistPosition,
        offerExpiresAt: offers.get(rsvp.id) ?? null,
        attendance: attendance.get(rsvp.id)?.status ?? 'pending',
        score: score
          ? {
              preparation: score.preparation,
              communication: score.communication,
              practical: score.practical,
              professionalism: score.professionalism,
              total: score.total,
              status: score.status,
              feedback: score.feedback,
              passed: score.total >= THRESHOLDS.sessionPass,
              finalisedAt: iso(score.finalisedAt),
            }
          : null,
      }
    }),
  })
}

/** The confirmed booking to record against, after the scope and session-state checks. */
function loadRsvp(scope: Scope, rsvpId: string): RsvpRow {
  const rsvp = db.rsvps.find((r) => r.id === rsvpId)
  const session = rsvp ? db.sessions.find((s) => s.id === rsvp.sessionId) : undefined
  if (!rsvp || !session) throw ApiError.notFound('Booking not found')
  assertSessionInScope(scope, rsvp.sessionId)
  if (session.status === 'cancelled') {
    throw ApiError.conflict(
      'SESSION_CANCELLED',
      'A cancelled session cannot record attendance or scores.',
    )
  }
  if (session.status === 'draft') {
    throw ApiError.conflict('SESSION_DRAFT', 'Publish the session before recording attendance.')
  }
  if (rsvp.status !== 'confirmed') {
    throw ApiError.conflict('NOT_CONFIRMED', 'Only confirmed learners have attendance.')
  }
  return rsvp
}

function refreshProgress(learnerId: string, sessionId: string) {
  const code = programmeOf(sessionId)
  if (code) recomputeEnrolment(learnerId, code)
}

export async function markAttendance(input: AttendanceUpdateInput) {
  await delay()
  const { viewer, scope } = markerScope()
  const body = parseInput(attendanceUpdateInput, input)
  const rsvp = loadRsvp(scope, body.rsvpId)
  const current = db.attendance.find((a) => a.rsvpId === rsvp.id)
  const score = db.sessionScores.find((s) => s.rsvpId === rsvp.id)
  const previous = current?.status ?? 'pending'
  if (previous === body.status) return { rsvpId: rsvp.id, status: previous, scoreRemoved: false }

  const finalised = score?.status === 'final'
  if (finalised && !body.correctionReason) {
    throw new ApiError(
      400,
      'CORRECTION_REASON_REQUIRED',
      'This learner has a final score. Give a reason for the correction.',
    )
  }

  const markedAt = nowIso()
  if (current) {
    updateRow(current, { status: body.status, markedBy: viewer.id, markedAt })
  } else {
    insertRow('attendance', {
      rsvpId: rsvp.id,
      sessionId: rsvp.sessionId,
      learnerId: rsvp.learnerId,
      status: body.status,
      markedBy: viewer.id,
      markedAt,
    })
  }

  // Absence never passes: a score cannot stand without attendance.
  const scoreRemoved = Boolean(score) && !PRESENT.includes(body.status)
  if (scoreRemoved) {
    const index = db.sessionScores.findIndex((s) => s.rsvpId === rsvp.id)
    if (index >= 0) db.sessionScores.splice(index, 1)
  }

  recordAudit(viewer, {
    action: finalised ? 'marking.correct' : 'attendance.mark',
    objectType: 'attendance',
    objectId: rsvp.id,
    before: { attendance: previous, score: score?.total ?? null },
    after: { attendance: body.status, score: scoreRemoved ? null : (score?.total ?? null) },
    reason: body.correctionReason ?? null,
  })
  refreshProgress(rsvp.learnerId, rsvp.sessionId)
  commit()
  return { rsvpId: rsvp.id, status: body.status, scoreRemoved }
}

export async function recordScore(input: SessionScoreInput) {
  await delay()
  const { viewer, scope } = markerScope()
  const body = parseInput(sessionScoreInput, input)
  const rsvp = loadRsvp(scope, body.rsvpId)
  const present = db.attendance.find((a) => a.rsvpId === rsvp.id)
  if (!present || !PRESENT.includes(present.status)) {
    throw ApiError.conflict(
      'ABSENCE_CANNOT_PASS',
      'Mark the learner attended or late before scoring. Absence never counts as a pass.',
    )
  }
  const existing = db.sessionScores.find((s) => s.rsvpId === rsvp.id)
  const correction = existing?.status === 'final'
  if (correction) {
    if (body.status === 'draft') {
      throw ApiError.conflict('ALREADY_FINAL', 'A final score cannot return to draft.')
    }
    if (!body.correctionReason) {
      throw new ApiError(
        400,
        'CORRECTION_REASON_REQUIRED',
        'This score is final. Give a reason for the correction.',
      )
    }
  }

  const total = body.preparation + body.communication + body.practical + body.professionalism
  const before = existing ? { total: existing.total, status: existing.status } : null
  const values = {
    preparation: body.preparation,
    communication: body.communication,
    practical: body.practical,
    professionalism: body.professionalism,
    total,
    status: body.status,
    feedback: body.feedback ?? null,
    correctionReason: correction ? (body.correctionReason ?? null) : null,
    scoredBy: viewer.id,
    finalisedAt: body.status === 'final' ? (existing?.finalisedAt ?? nowIso()) : null,
  }
  if (existing) updateRow(existing, values)
  else {
    insertRow('sessionScores', {
      ...values,
      rsvpId: rsvp.id,
      sessionId: rsvp.sessionId,
      learnerId: rsvp.learnerId,
    })
  }

  recordAudit(viewer, {
    action: correction
      ? 'marking.correct'
      : body.status === 'final'
        ? 'marking.finalise'
        : 'marking.draft',
    objectType: 'session_score',
    objectId: rsvp.id,
    before,
    after: { total, status: body.status },
    reason: correction ? (body.correctionReason ?? null) : null,
  })
  if (body.status === 'final') refreshProgress(rsvp.learnerId, rsvp.sessionId)
  commit()
  return { rsvpId: rsvp.id, total, status: body.status, passed: total >= THRESHOLDS.sessionPass }
}

/**
 * Assigned learners (brief §10): the learners booked on the trainer's sessions, with limited
 * fields only. An admin calling this sees every booked learner (capped for the screen).
 */
export async function getAssignedLearners() {
  await delay()
  const { viewer, scope } = markerScope()
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const attendance = new Map(db.attendance.map((a) => [a.rsvpId, a.status]))
  const scores = new Map(db.sessionScores.map((s) => [s.rsvpId, s]))

  const rows = db.rsvps
    .flatMap((r) => {
      const session = sessions.get(r.sessionId)
      if (!session) return []
      if (scope.kind === 'trainer' && session.trainerId !== scope.trainerId) return []
      return [{ rsvp: r, session }]
    })
    .sort((a, b) => ms(b.session.startsAt) - ms(a.session.startsAt))
    .slice(0, scope.kind === 'trainer' ? 2000 : 500)

  const byLearner = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byLearner.get(row.rsvp.learnerId) ?? []
    list.push(row)
    byLearner.set(row.rsvp.learnerId, list)
  }

  const items = [...byLearner.entries()].map(([learnerId, bookings]) => {
    const latest = bookings[0] as (typeof rows)[number]
    const profile = profiles.get(learnerId)
    const visible = pickVisibleLearnerFields(viewer.role, {
      learnerCode: profile?.learnerCode ?? 'Unknown',
      displayName: profile?.fullName ?? 'Learner',
    })
    const scored = bookings.find((b) => scores.has(b.rsvp.id))
    const score = scored ? scores.get(scored.rsvp.id) : undefined
    return {
      learnerCode: String(visible.learnerCode ?? ''),
      displayName: String(visible.displayName ?? ''),
      latestSession: {
        id: latest.session.id,
        code: latest.session.code,
        title: latest.session.title,
        status: latest.session.status,
        startsAt: new Date(latest.session.startsAt).toISOString(),
        rsvpStatus: latest.rsvp.status,
      },
      bookings: bookings.length,
      attendance:
        (scored ? attendance.get(scored.rsvp.id) : undefined) ??
        attendance.get(latest.rsvp.id) ??
        null,
      score: score
        ? {
            total: score.total,
            status: score.status,
            passed: score.total >= THRESHOLDS.sessionPass,
          }
        : null,
    }
  })
  items.sort((a, b) => a.learnerCode.localeCompare(b.learnerCode))
  return out({ items, total: items.length })
}
