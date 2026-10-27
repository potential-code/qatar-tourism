import type { AttendanceValue, SessionFormat, SessionStatus } from '@shared/constants'

export const FORMAT_LABEL: Record<SessionFormat, string> = {
  in_person: 'In person',
  online: 'Live online',
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  full: 'Full',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ATTENDANCE_LABEL: Record<AttendanceValue, string> = {
  pending: 'Pending',
  attended: 'Attended',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
}

export const RSVP_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
  moved: 'Moved',
}

export const PREREQUISITE_LABEL: Record<string, string> = {
  a_level1_complete: 'Program A Level 1 complete',
}

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours} hour${hours === 1 ? '' : 's'}` : `${minutes} minutes`
}

export function locationLabel(session: {
  format: SessionFormat
  venue: string | null
  room: string | null
  meetingRef: string | null
}) {
  if (session.format === 'in_person') {
    return [session.venue, session.room].filter(Boolean).join(', ') || 'Venue to be confirmed'
  }
  return session.meetingRef
    ? `Demo meeting room ${session.meetingRef}`
    : 'Online room to be confirmed'
}

/** Idempotency key for one confirmed action; retrying the same request reuses it. */
export const newActionKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
