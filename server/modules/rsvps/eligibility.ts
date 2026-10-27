import {
  assessmentAttempts,
  assessments,
  courses,
  enrolments,
  programmes,
  rsvps,
  sessions,
  unitProgress,
} from '@server/db/schema'
import { formatQatarDateTime } from '@server/db/seed/format'
import { THRESHOLDS } from '@shared/constants'
import type { BookingBlockCode } from '@shared/schemas/booking-rsvp'
import { and, eq, gte, inArray } from 'drizzle-orm'
import { ACTIVE_RSVP, type Reader, type SessionCard } from '../sessions/session-store'

/**
 * Who may book what (brief §6): programme enrolment, the Level 1 prerequisite, the booking
 * deadline, duplicates, one active reservation per required stage and no overlapping bookings.
 * Pure evaluation over a learner context loaded once, so the catalogue and the booking
 * transaction apply exactly the same rules.
 */

/** Program A Level 1 foundation units, in path order (brief §6–7). */
export const A_LEVEL1_UNITS = ['C01', 'C03', 'C04', 'C02'] as const
export const PREREQUISITE_LEVEL1 = 'a_level1_complete'

export type ActiveBooking = {
  rsvpId: string
  sessionId: string
  sessionCode: string
  sessionTitle: string
  programmeId: string
  isCompletionGate: boolean
  startsAt: Date
  endsAt: Date
  status: 'confirmed' | 'waitlisted'
}

export type LearnerContext = {
  userId: string
  /** Programme codes the learner is enrolled in. */
  programmes: Set<'A' | 'B' | 'C'>
  level1: { complete: boolean; missing: string[] }
  active: ActiveBooking[]
}

export async function loadLearnerContext(
  executor: Reader,
  userId: string,
): Promise<LearnerContext> {
  const enrolled = await executor
    .select({ id: enrolments.id, code: programmes.code })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(eq(enrolments.learnerId, userId))
  const programmeSet = new Set(enrolled.map((row) => row.code))
  const aEnrolment = enrolled.find((row) => row.code === 'A')

  let level1 = { complete: false, missing: ['Enrol in Program A'] }
  if (aEnrolment) {
    const [units, quiz] = await Promise.all([
      executor
        .select({ code: courses.code, title: courses.title, status: unitProgress.status })
        .from(courses)
        .leftJoin(
          unitProgress,
          and(eq(unitProgress.courseId, courses.id), eq(unitProgress.enrolmentId, aEnrolment.id)),
        )
        .where(inArray(courses.code, [...A_LEVEL1_UNITS])),
      executor
        .select({ id: assessmentAttempts.id })
        .from(assessmentAttempts)
        .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
        .where(
          and(
            eq(assessmentAttempts.enrolmentId, aEnrolment.id),
            eq(assessments.kind, 'formative'),
            eq(assessmentAttempts.status, 'submitted'),
            gte(assessmentAttempts.score, THRESHOLDS.foundationQuizPass),
          ),
        )
        .limit(1),
    ])
    const missing = A_LEVEL1_UNITS.flatMap((code) => {
      const unit = units.find((row) => row.code === code)
      return unit?.status === 'completed' ? [] : [`${code} ${unit?.title ?? ''}`.trim()]
    })
    if (quiz.length === 0) {
      missing.push(`Pass the foundation quiz (${THRESHOLDS.foundationQuizPass} percent)`)
    }
    level1 = { complete: missing.length === 0, missing }
  }

  const active = await executor
    .select({
      rsvpId: rsvps.id,
      sessionId: sessions.id,
      sessionCode: sessions.code,
      sessionTitle: sessions.title,
      programmeId: sessions.programmeId,
      isCompletionGate: sessions.isCompletionGate,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      status: rsvps.status,
    })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .where(and(eq(rsvps.learnerId, userId), inArray(rsvps.status, [...ACTIVE_RSVP])))

  return {
    userId,
    programmes: programmeSet,
    level1,
    active: active as ActiveBooking[],
  }
}

export type Eligibility =
  | { state: 'bookable' }
  | { state: 'waitlist' }
  | { state: 'booked'; rsvpId: string; status: 'confirmed' | 'waitlisted' }
  | { state: 'locked'; code: BookingBlockCode; reason: string }

const lock = (code: BookingBlockCode, reason: string): Eligibility => ({
  state: 'locked',
  code,
  reason,
})

/**
 * Evaluates one session for one learner. `ignoreRsvpId` leaves out the booking being moved, so
 * a learner can reschedule from one required session to another.
 */
export function evaluate(
  card: SessionCard,
  ctx: LearnerContext,
  at: Date,
  ignoreRsvpId?: string,
): Eligibility {
  const s = card.session
  const active = ctx.active.filter((booking) => booking.rsvpId !== ignoreRsvpId)

  const own = active.find((booking) => booking.sessionId === s.id)
  if (own) return { state: 'booked', rsvpId: own.rsvpId, status: own.status }

  if (!['published', 'full'].includes(s.status) || s.startsAt <= at) {
    return lock('NOT_BOOKABLE', 'This session is no longer open for booking.')
  }
  if (s.bookingDeadline && s.bookingDeadline <= at) {
    return lock(
      'BOOKING_CLOSED',
      `Booking closed on ${formatQatarDateTime(s.bookingDeadline)}. Choose another session.`,
    )
  }
  if (!ctx.programmes.has(card.programmeCode)) {
    return lock(
      'NOT_ENROLLED',
      `This session is for Program ${card.programmeCode} learners. Enrol in Program ${card.programmeCode} to book it.`,
    )
  }
  if (s.prerequisite === PREREQUISITE_LEVEL1 && !ctx.level1.complete) {
    return lock(
      'PREREQUISITE_MISSING',
      `Complete Level 1 first. Still to do: ${ctx.level1.missing.join('; ')}.`,
    )
  }
  if (s.isCompletionGate) {
    const held = active.find(
      (booking) => booking.isCompletionGate && booking.programmeId === s.programmeId,
    )
    if (held) {
      return lock(
        'ACTIVE_RESERVATION',
        `You already hold a place on ${held.sessionTitle} (${held.sessionCode}). Use Reschedule to move it to this session.`,
      )
    }
  }
  const clash = active.find((booking) => booking.startsAt < s.endsAt && booking.endsAt > s.startsAt)
  if (clash) {
    return lock(
      'TIME_CONFLICT',
      `This overlaps your booking for ${clash.sessionTitle} (${clash.sessionCode}).`,
    )
  }
  if (card.confirmed >= s.capacity) return { state: 'waitlist' }
  return { state: 'bookable' }
}

/** True when a learner may still change the booking themselves (24-hour demo policy). */
export function withinSelfService(startsAt: Date, at: Date) {
  return startsAt.getTime() - at.getTime() >= THRESHOLDS.selfServiceChangeHours * 3_600_000
}
