import { type ProgrammeCode, THRESHOLDS } from '@shared/constants'
import type { BookingBlockCode } from '@shared/schemas/booking-rsvp'
import { db, formatQatarDateTime } from '../api'
import { isActiveRsvp, ms, type SessionCard } from '../sessions/store'

/**
 * Who may book what (brief §6): programme enrolment, the Level 1 prerequisite, the booking
 * deadline, duplicates, one active reservation per required stage and no overlapping bookings.
 * Pure evaluation over a learner context loaded once, so the catalogue and the booking apply
 * exactly the same rules.
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
  startsAt: number
  endsAt: number
  status: 'confirmed' | 'waitlisted' | 'offered'
}

export type LearnerContext = {
  userId: string
  /** Programme codes the learner is enrolled in. */
  programmes: Set<ProgrammeCode>
  level1: { complete: boolean; missing: string[] }
  active: ActiveBooking[]
}

function level1Of(enrolmentId: string): LearnerContext['level1'] {
  const missing: string[] = A_LEVEL1_UNITS.flatMap((code) => {
    const course = db.courses.find((c) => c.code === code)
    const progress = course
      ? db.unitProgress.find((u) => u.courseId === course.id && u.enrolmentId === enrolmentId)
      : undefined
    return progress?.status === 'completed' ? [] : [`${code} ${course?.title ?? ''}`.trim()]
  })
  const formative = new Set(db.assessments.filter((a) => a.kind === 'formative').map((a) => a.id))
  const passed = db.assessmentAttempts.some(
    (a) =>
      a.enrolmentId === enrolmentId &&
      formative.has(a.assessmentId) &&
      a.status === 'submitted' &&
      (a.score ?? -1) >= THRESHOLDS.foundationQuizPass,
  )
  if (!passed) missing.push(`Pass the foundation quiz (${THRESHOLDS.foundationQuizPass} percent)`)
  return { complete: missing.length === 0, missing }
}

export function loadLearnerContext(userId: string): LearnerContext {
  const programmeCodes = new Map(db.programmes.map((p) => [p.id, p.code]))
  const enrolled = db.enrolments
    .filter((e) => e.learnerId === userId)
    .flatMap((e) => {
      const code = programmeCodes.get(e.programmeId)
      return code ? [{ id: e.id, code }] : []
    })
  const aEnrolment = enrolled.find((row) => row.code === 'A')
  const level1 = aEnrolment
    ? level1Of(aEnrolment.id)
    : { complete: false, missing: ['Enrol in Program A'] }

  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  const active = db.rsvps.flatMap((r): ActiveBooking[] => {
    if (r.learnerId !== userId || !isActiveRsvp(r)) return []
    const s = sessions.get(r.sessionId)
    if (!s) return []
    return [
      {
        rsvpId: r.id,
        sessionId: s.id,
        sessionCode: s.code,
        sessionTitle: s.title,
        programmeId: s.programmeId,
        isCompletionGate: s.isCompletionGate,
        startsAt: ms(s.startsAt),
        endsAt: ms(s.endsAt),
        status: r.status as ActiveBooking['status'],
      },
    ]
  })

  return { userId, programmes: new Set(enrolled.map((row) => row.code)), level1, active }
}

export type Eligibility =
  | { state: 'bookable' }
  | { state: 'waitlist' }
  | { state: 'booked'; rsvpId: string; status: 'confirmed' | 'waitlisted' | 'offered' }
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
  const now = at.getTime()
  const start = ms(s.startsAt)
  const end = ms(s.endsAt)
  const active = ctx.active.filter((booking) => booking.rsvpId !== ignoreRsvpId)

  const own = active.find((booking) => booking.sessionId === s.id)
  if (own) return { state: 'booked', rsvpId: own.rsvpId, status: own.status }

  if (!['published', 'full'].includes(s.status) || start <= now) {
    return lock('NOT_BOOKABLE', 'This session is no longer open for booking.')
  }
  if (s.bookingDeadline && ms(s.bookingDeadline) <= now) {
    return lock(
      'BOOKING_CLOSED',
      `Booking closed on ${formatQatarDateTime(new Date(s.bookingDeadline))}. Choose another session.`,
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
  const clash = active.find((booking) => booking.startsAt < end && booking.endsAt > start)
  if (clash) {
    return lock(
      'TIME_CONFLICT',
      `This overlaps your booking for ${clash.sessionTitle} (${clash.sessionCode}).`,
    )
  }
  if (card.confirmed + card.offered >= s.capacity) return { state: 'waitlist' }
  return { state: 'bookable' }
}

/** True when a learner may still change the booking themselves (24-hour demo policy). */
export function withinSelfService(startsAt: string | Date, at: Date): boolean {
  const start = typeof startsAt === 'string' ? ms(startsAt) : startsAt.getTime()
  return start - at.getTime() >= THRESHOLDS.selfServiceChangeHours * 3_600_000
}
