import { z } from 'zod'

/**
 * Learner booking inputs (brief §6). Kept beside the Phase 1 session schemas; this file is
 * owned by the sessions agent.
 */

/** Book a seat. A full session offers the waitlist, which the learner must ask for. */
export const bookingCreateInput = z.object({
  sessionId: z.uuid(),
  joinWaitlist: z.boolean().default(false),
})
export type BookingCreateInput = z.infer<typeof bookingCreateInput>

/** Move an active booking to another eligible session (learner reschedule). */
export const bookingMoveInput = z.object({
  rsvpId: z.uuid(),
  toSessionId: z.uuid(),
})
export type BookingMoveInput = z.infer<typeof bookingMoveInput>

export const bookingCancelInput = z.object({
  reason: z.string().trim().max(300).optional(),
})

/** Inside 24 hours a change becomes a request for admin review (brief §6 demo policy). */
export const bookingChangeRequestInput = z.object({
  kind: z.enum(['cancel', 'reschedule']),
  reason: z.string().trim().min(5).max(300),
})
export type BookingChangeRequestInput = z.infer<typeof bookingChangeRequestInput>

/** Codes the booking API answers with when a booking is refused, so the UI can explain. */
export const BOOKING_BLOCK_CODES = [
  'NOT_ENROLLED',
  'PREREQUISITE_MISSING',
  'BOOKING_CLOSED',
  'NOT_BOOKABLE',
  'ALREADY_BOOKED',
  'TIME_CONFLICT',
  'ACTIVE_RESERVATION',
  'SESSION_FULL',
  'ADMIN_REVIEW_REQUIRED',
] as const
export type BookingBlockCode = (typeof BOOKING_BLOCK_CODES)[number]
