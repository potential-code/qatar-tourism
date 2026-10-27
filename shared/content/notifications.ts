/**
 * Notification and email copy (brief §11), verbatim. Placeholders are `[Like this]`; render with
 * `renderTemplate`. Seeded and walkthrough emails are SIMULATED: never describe one as delivered
 * unless a provider has confirmed it.
 */

export type NotificationTemplate = {
  key: 'session_rescheduled' | 'session_cancelled'
  subject: string
  body: string
}

export const NOTIFICATION_TEMPLATES: Record<NotificationTemplate['key'], NotificationTemplate> = {
  session_rescheduled: {
    key: 'session_rescheduled',
    subject: 'Your session has been rescheduled — [Session title]',
    body: 'Hello [First name], your session with [Trainer] has moved from [Old date and time] to [New date and time, Qatar time]. Format: [Format]. Location: [Venue or online details]. Reason: [Reason]. Please review your booking in My sessions. You can choose another eligible session if the new time does not work for you.',
  },
  session_cancelled: {
    key: 'session_cancelled',
    subject: 'Session cancelled — [Session title]',
    body: 'Hello [First name], your session scheduled for [Date and time] has been cancelled. Reason: [Reason]. Your learning progress has been saved. Please visit My sessions to choose another available session. Contact the Academy through Help if you need support.',
  },
}

/** Replaces each `[Placeholder]` with its value; an unknown placeholder is left visible. */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\[([^\]]+)\]/g, (match, name: string) => values[name] ?? match)
}

/** Demo modal copy (brief §11). */
export function rescheduleModalCopy(affected: number): string {
  return `Session rescheduled. In-app notifications have been created for ${affected} registered learners. Demo emails have been generated in the notification log; no external emails were sent.`
}

export function cancellationModalCopy(affected: number): string {
  return `Session cancelled. In-app notifications have been created for ${affected} registered learners. Demo emails have been generated in the notification log; no external emails were sent.`
}

export const SIMULATED_EMAIL_LABEL = 'Simulated email: no external email was sent'
