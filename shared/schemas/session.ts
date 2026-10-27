import { z } from 'zod'
import {
  ATTENDANCE_VALUES,
  RSVP_STATUSES,
  SCORE_STATUSES,
  SESSION_FORMATS,
  SESSION_STATUSES,
} from '../constants/enums'
import { isoInstant } from './common'

const sessionBase = z.object({
  title: z.string().trim().min(3).max(160),
  programmeId: z.uuid(),
  level: z.string().trim().max(60).nullable().optional(),
  stage: z.string().trim().max(120).nullable().optional(),
  trainerId: z.uuid(),
  format: z.enum(SESSION_FORMATS),
  startsAt: isoInstant,
  endsAt: isoInstant,
  timezone: z.string().default('Asia/Qatar'),
  capacity: z.number().int().min(1).max(200),
  venue: z.string().trim().max(120).nullable().optional(),
  room: z.string().trim().max(80).nullable().optional(),
  accessNote: z.string().trim().max(300).nullable().optional(),
  meetingRef: z.string().trim().max(120).nullable().optional(),
  joinInstructions: z.string().trim().max(400).nullable().optional(),
  bookingDeadline: isoInstant.nullable().optional(),
  cancellationPolicy: z.string().trim().min(5).max(400),
  description: z.string().trim().min(10).max(1000),
  prerequisite: z.string().trim().max(60).nullable().optional(),
  materials: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
})

/** In-person needs venue and room and access note; online needs a meeting reference and instructions. */
export const sessionCreateInput = sessionBase.superRefine((value, ctx) => {
  if (new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End time must be after the start time',
    })
  }
  if (value.format === 'in_person') {
    for (const key of ['venue', 'room', 'accessNote'] as const) {
      if (!value[key])
        ctx.addIssue({ code: 'custom', path: [key], message: 'Required for in-person sessions' })
    }
  } else {
    for (const key of ['meetingRef', 'joinInstructions'] as const) {
      if (!value[key])
        ctx.addIssue({ code: 'custom', path: [key], message: 'Required for online sessions' })
    }
  }
})
export type SessionCreateInput = z.infer<typeof sessionCreateInput>

export const sessionStatusInput = z.object({ status: z.enum(SESSION_STATUSES) })

/** Rescheduling needs a new time and a reason (brief §10). */
export const sessionRescheduleInput = z.object({
  startsAt: isoInstant,
  endsAt: isoInstant,
  reason: z.string().trim().min(5).max(300),
  venue: z.string().trim().max(120).nullable().optional(),
  meetingRef: z.string().trim().max(120).nullable().optional(),
  /** Client-generated; retrying with the same key never duplicates notifications. */
  idempotencyKey: z.string().min(8).max(80),
})
export type SessionRescheduleInput = z.infer<typeof sessionRescheduleInput>

export const sessionCancelInput = z.object({
  reason: z.string().trim().min(5).max(300),
  idempotencyKey: z.string().min(8).max(80),
})

export const rsvpCreateInput = z.object({ sessionId: z.uuid() })
export const rsvpMoveInput = z.object({ rsvpId: z.uuid(), toSessionId: z.uuid() })
export const rsvpStatusView = z.enum(RSVP_STATUSES)

export const attendanceMarkInput = z.object({
  rsvpId: z.uuid(),
  status: z.enum(ATTENDANCE_VALUES),
})

/** Rubric: preparation 20, communication 30, practical 30, professionalism 20. */
export const sessionScoreInput = z.object({
  rsvpId: z.uuid(),
  preparation: z.number().int().min(0).max(20),
  communication: z.number().int().min(0).max(30),
  practical: z.number().int().min(0).max(30),
  professionalism: z.number().int().min(0).max(20),
  feedback: z.string().trim().max(1000).optional(),
  status: z.enum(SCORE_STATUSES),
  /** Required when correcting a final score. */
  correctionReason: z.string().trim().min(5).max(300).optional(),
})
export type SessionScoreInput = z.infer<typeof sessionScoreInput>

export const sessionListQuery = z.object({
  programme: z.enum(['A', 'B', 'C']).optional(),
  status: z.enum(SESSION_STATUSES).optional(),
  format: z.enum(SESSION_FORMATS).optional(),
  from: isoInstant.optional(),
  to: isoInstant.optional(),
})
