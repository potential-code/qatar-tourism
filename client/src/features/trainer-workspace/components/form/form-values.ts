import { type SessionUpdateInput, sessionUpdateInput } from '@shared/schemas/trainer-ops'
import type { SessionInfo } from '@/features/sessions/types'
import { qatarDateKey, qatarTime, qatarToIso } from '@/features/sessions/utils/qatar-time'
import type { FormOptions } from '../../types'

/** Form state: wall-clock Qatar date and times, converted to UTC instants on submit. */
export type SessionFormValues = {
  title: string
  programmeId: string
  trainerId: string
  level: string
  stage: string
  format: 'in_person' | 'online'
  date: string
  startTime: string
  endTime: string
  capacity: string
  venue: string
  room: string
  accessNote: string
  meetingRef: string
  joinInstructions: string
  deadlineDate: string
  deadlineTime: string
  cancellationPolicy: string
  description: string
  prerequisite: string
  materials: string
}

export function toFormValues(options: FormOptions, session?: SessionInfo): SessionFormValues {
  if (session) {
    return {
      title: session.title,
      programmeId: session.programmeId,
      trainerId: session.trainer.id,
      level: session.level ?? '',
      stage: session.stage ?? '',
      format: session.format,
      date: qatarDateKey(session.startsAt),
      startTime: qatarTime(session.startsAt),
      endTime: qatarTime(session.endsAt),
      capacity: String(session.capacity),
      venue: session.venue ?? '',
      room: session.room ?? '',
      accessNote: session.accessNote ?? '',
      meetingRef: session.meetingRef ?? '',
      joinInstructions: session.joinInstructions ?? '',
      deadlineDate: session.bookingDeadline ? qatarDateKey(session.bookingDeadline) : '',
      deadlineTime: session.bookingDeadline ? qatarTime(session.bookingDeadline) : '',
      cancellationPolicy: session.cancellationPolicy,
      description: session.description,
      prerequisite: session.prerequisite ?? 'none',
      materials: session.materials.map((m) => m.title).join('\n'),
    }
  }
  const programme = options.programmes[0]
  return {
    title: '',
    programmeId: programme?.id ?? '',
    trainerId: options.trainers[0]?.id ?? '',
    level: programme?.code === 'A' ? 'Level 2' : '',
    stage: programme?.code === 'A' ? 'Trainer-led application' : '',
    format: 'in_person',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    capacity: '20',
    venue: 'Demo Academy',
    room: '',
    accessNote: '',
    meetingRef: '',
    joinInstructions:
      'Simulated online classroom. The join link is a placeholder: no real meeting room is created for this demonstration.',
    deadlineDate: '',
    deadlineTime: '',
    cancellationPolicy: options.defaults.cancellationPolicy,
    description: '',
    prerequisite: programme?.code === 'A' ? 'a_level1_complete' : 'none',
    materials: '',
  }
}

const iso = (date: string, time: string) => (date && time ? qatarToIso(date, time) : '')
const orNull = (value: string) => (value.trim() ? value.trim() : null)

export function toPayload(v: SessionFormValues): SessionUpdateInput {
  return {
    title: v.title.trim(),
    programmeId: v.programmeId,
    trainerId: v.trainerId,
    level: orNull(v.level),
    stage: orNull(v.stage),
    format: v.format,
    startsAt: iso(v.date, v.startTime),
    endsAt: iso(v.date, v.endTime),
    capacity: Number(v.capacity),
    venue: orNull(v.venue),
    room: orNull(v.room),
    accessNote: orNull(v.accessNote),
    meetingRef: orNull(v.meetingRef),
    joinInstructions: orNull(v.joinInstructions),
    bookingDeadline: v.deadlineDate ? iso(v.deadlineDate, v.deadlineTime || '00:00') : null,
    cancellationPolicy: v.cancellationPolicy.trim(),
    description: v.description.trim(),
    prerequisite: v.prerequisite,
    materials: v.materials
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title) => ({ title, url: '#demo-resource' })),
  }
}

/** API field path to the form field that shows its error. */
const FIELD_OF: Record<string, keyof SessionFormValues> = {
  startsAt: 'startTime',
  endsAt: 'endTime',
  bookingDeadline: 'deadlineDate',
}

const MISSING: Partial<Record<keyof SessionFormValues, string>> = {
  title: 'Enter a title of at least 3 characters',
  date: 'Choose a date',
  description: 'Describe the session in at least 10 characters',
  cancellationPolicy: 'State the cancellation policy',
  capacity: 'Capacity must be a whole number from 1 to 200',
}

/** Validates with the same zod schema the API uses, mapped onto the form fields. */
export function validateSession(
  v: SessionFormValues,
): Partial<Record<keyof SessionFormValues, string>> | undefined {
  const errors: Partial<Record<keyof SessionFormValues, string>> = {}
  if (!v.date) errors.date = MISSING.date
  const parsed = sessionUpdateInput.safeParse(toPayload(v))
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = String(issue.path[0] ?? '')
      const field = (FIELD_OF[path] ?? path) as keyof SessionFormValues
      if (field in v && !errors[field]) {
        errors[field] = MISSING[field] && issue.code !== 'custom' ? MISSING[field] : issue.message
      }
    }
  }
  return Object.keys(errors).length ? errors : undefined
}
