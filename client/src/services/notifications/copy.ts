import { NOTIFICATION_TEMPLATES, renderTemplate } from '@shared/content/notifications'
import { formatQatarDateTime } from '@shared/utils/qatar-calendar'

/**
 * Builds session notification messages. The reschedule and cancellation copy is the brief §11
 * template, verbatim, with merge fields. The waitlist and booking-change messages have no brief
 * copy, so they follow the same tone and are defined here.
 */

export type SessionCopyContext = {
  sessionTitle: string
  trainerName: string
  format: 'in_person' | 'online'
  location: string
}

/** The templates add their own full stop after the reason, so drop a trailing one. */
const sentence = (text: string) => text.trim().replace(/[.\s]+$/, '')

export const firstNameOf = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName

export const formatLabel = (format: 'in_person' | 'online') =>
  format === 'in_person' ? 'In person' : 'Live online'

export function rescheduledMessage(
  ctx: SessionCopyContext,
  firstName: string,
  previousStart: Date,
  newStart: Date,
  reason: string,
) {
  const values = {
    'Session title': ctx.sessionTitle,
    'First name': firstName,
    Trainer: ctx.trainerName,
    'Old date and time': formatQatarDateTime(previousStart),
    'New date and time, Qatar time': formatQatarDateTime(newStart),
    Format: formatLabel(ctx.format),
    'Venue or online details': ctx.location,
    Reason: sentence(reason),
  }
  const template = NOTIFICATION_TEMPLATES.session_rescheduled
  return {
    subject: renderTemplate(template.subject, values),
    body: renderTemplate(template.body, values),
  }
}

export function cancelledMessage(
  ctx: SessionCopyContext,
  firstName: string,
  start: Date,
  reason: string,
) {
  const values = {
    'Session title': ctx.sessionTitle,
    'First name': firstName,
    'Date and time': formatQatarDateTime(start),
    Reason: sentence(reason),
  }
  const template = NOTIFICATION_TEMPLATES.session_cancelled
  return {
    subject: renderTemplate(template.subject, values),
    body: renderTemplate(template.body, values),
  }
}

export function waitlistRescheduledMessage(
  ctx: SessionCopyContext,
  firstName: string,
  previousStart: Date,
  newStart: Date,
  position: number,
) {
  return {
    subject: `Waitlist update: ${ctx.sessionTitle} has moved`,
    body: `Hello ${firstName}, a session you are on the waitlist for has moved from ${formatQatarDateTime(previousStart)} to ${formatQatarDateTime(newStart)}. You are number ${position} on the waitlist. We will let you know if a seat becomes available. You can choose another eligible session in My sessions.`,
  }
}

export function waitlistCancelledMessage(
  ctx: SessionCopyContext,
  firstName: string,
  start: Date,
  reason: string,
) {
  return {
    subject: `Waitlist update: ${ctx.sessionTitle} has been cancelled`,
    body: `Hello ${firstName}, the session you were on the waitlist for, scheduled for ${formatQatarDateTime(start)}, has been cancelled. Reason: ${sentence(reason)}. Your learning progress has been saved. Please visit My sessions to choose another available session.`,
  }
}

export function waitlistPromotedMessage(ctx: SessionCopyContext, firstName: string, start: Date) {
  return {
    subject: `Your seat is confirmed: ${ctx.sessionTitle}`,
    body: `Hello ${firstName}, a seat has become available and your booking for ${ctx.sessionTitle} on ${formatQatarDateTime(start)} is now confirmed. Please review it in My sessions.`,
  }
}

export function changeRequestMessage(
  learnerCode: string,
  sessionTitle: string,
  start: Date,
  kind: 'cancel' | 'reschedule',
  reason: string,
) {
  const action = kind === 'cancel' ? 'cancel' : 'reschedule'
  return {
    subject: `Admin review requested: ${learnerCode} wants to ${action} a booking`,
    body: `Learner ${learnerCode} asked to ${action} their booking for ${sessionTitle} on ${formatQatarDateTime(start)}, inside the 24-hour self-service window. Reason: ${sentence(reason)}.`,
  }
}

/** The learner's answer to a late change request (brief §6: changes inside 24 hours). */
export function changeDecisionMessage(
  firstName: string,
  sessionTitle: string,
  kind: 'cancel' | 'reschedule',
  decision: 'approved' | 'declined',
  note: string | null,
) {
  const extra = note ? ` Note from the Academy: ${sentence(note)}.` : ''
  if (decision === 'approved') {
    return {
      subject: `Your change request was approved: ${sessionTitle}`,
      body:
        kind === 'cancel'
          ? `Hello ${firstName}, the Academy approved your request. Your place on ${sessionTitle} has been released and your learning progress is saved.${extra}`
          : `Hello ${firstName}, the Academy approved your request. Your place on ${sessionTitle} has been released, so you can choose another eligible session in My sessions.${extra}`,
    }
  }
  return {
    subject: `Your change request was declined: ${sessionTitle}`,
    body: `Hello ${firstName}, the Academy reviewed your request and your booking for ${sessionTitle} stays in place.${extra} Please contact the Academy through Help if you need support.`,
  }
}

/** "Demo Academy, Room 2" or "Online: DEMO-ROOM-T02-2". */
export function locationOf(session: {
  format: 'in_person' | 'online'
  venue: string | null
  room: string | null
  meetingRef: string | null
}) {
  if (session.format === 'in_person') {
    return [session.venue, session.room].filter(Boolean).join(', ') || 'Venue to be confirmed'
  }
  return `Live online, demo meeting room ${session.meetingRef ?? 'to be confirmed'}`
}
