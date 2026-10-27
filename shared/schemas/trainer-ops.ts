import { z } from 'zod'
import { ATTENDANCE_VALUES, SESSION_FORMATS } from '../constants/enums'
import { isoInstant } from './common'

/**
 * Trainer workspace inputs (brief §10–11) that the Phase 1 session schemas do not cover.
 * Owned by the sessions agent.
 */

/** Session edit: the create fields, all present (the form always sends the whole session). */
export const sessionUpdateInput = z
  .object({
    title: z.string().trim().min(3).max(160),
    programmeId: z.uuid(),
    level: z.string().trim().max(60).nullable().optional(),
    stage: z.string().trim().max(120).nullable().optional(),
    trainerId: z.uuid(),
    format: z.enum(SESSION_FORMATS),
    startsAt: isoInstant,
    endsAt: isoInstant,
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
    materials: z
      .array(z.object({ title: z.string().trim().min(1).max(120), url: z.string().max(400) }))
      .max(10)
      .default([]),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endsAt) <= new Date(value.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End time must be after the start time',
      })
    }
    if (value.bookingDeadline && new Date(value.bookingDeadline) > new Date(value.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['bookingDeadline'],
        message: 'The booking deadline must be before the session starts',
      })
    }
    const required =
      value.format === 'in_person'
        ? (['venue', 'room', 'accessNote'] as const)
        : (['meetingRef', 'joinInstructions'] as const)
    for (const key of required) {
      if (!value[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message:
            value.format === 'in_person'
              ? 'Required for in-person sessions'
              : 'Required for online sessions',
        })
      }
    }
  })
export type SessionUpdateInput = z.infer<typeof sessionUpdateInput>

/** Create = the same fields, plus whether to publish straight to the catalogue. */
export const sessionCreateWithPublishInput = z.object({
  session: sessionUpdateInput,
  publish: z.boolean().default(false),
})
export type SessionCreateWithPublishInput = z.infer<typeof sessionCreateWithPublishInput>

/** Attendance, with the reason a change to a finalised record needs (brief §10). */
export const attendanceUpdateInput = z.object({
  rsvpId: z.uuid(),
  status: z.enum(ATTENDANCE_VALUES),
  correctionReason: z.string().trim().min(5).max(300).optional(),
})
export type AttendanceUpdateInput = z.infer<typeof attendanceUpdateInput>

export const notificationLogFilter = z.object({
  sessionId: z.uuid().optional(),
  eventId: z.string().max(200).optional(),
  channel: z.enum(['in_app', 'email']).optional(),
})
export type NotificationLogFilter = z.infer<typeof notificationLogFilter>

/** Export kinds the API knows. `personal` is blocked for trainers (brief §11). */
export const EXPORT_KINDS = ['marks', 'personal'] as const
export type ExportKind = (typeof EXPORT_KINDS)[number]
