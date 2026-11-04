import { qatarDateKey, qatarToIso } from '@/lib/format/qatar-time'
import type { SessionFormValues } from '../components/form/form-values'

/** The parts of a listed session the free-slot search needs. */
export interface BusySession {
  trainer: { id: string }
  startsAt: string
  endsAt: string
  status: string
}

const START = '10:00'
const END = '12:00'
/** Qatar's weekend is Friday and Saturday (UTC days 5 and 6 of a Qatar date). */
const WEEKEND = new Set([5, 6])

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * First weekday from a week after `nowIso` with a free 10:00–12:00 Qatar slot for the trainer.
 * Cancelled sessions do not block a slot, as in the service's own conflict check.
 */
export function findFreeSlot(
  sessions: readonly BusySession[],
  trainerId: string,
  nowIso: string,
): { date: string; startTime: string; endTime: string } {
  const first = addDays(qatarDateKey(nowIso), 7)
  const busy = sessions.filter((s) => s.trainer.id === trainerId && s.status !== 'cancelled')
  for (let offset = 0; offset < 120; offset++) {
    const date = addDays(first, offset)
    if (WEEKEND.has(new Date(`${date}T00:00:00Z`).getUTCDay())) continue
    const start = Date.parse(qatarToIso(date, START))
    const end = Date.parse(qatarToIso(date, END))
    const clash = busy.some((s) => Date.parse(s.startsAt) < end && Date.parse(s.endsAt) > start)
    if (!clash) return { date, startTime: START, endTime: END }
  }
  return { date: addDays(first, 120), startTime: START, endTime: END }
}

/**
 * Presenter sample for a new session. Keeps the chosen programme and trainer; fills both the
 * in-person and the online fields so switching the format stays valid.
 */
export function sampleSession(
  current: SessionFormValues,
  programmeCode: string | undefined,
  slot: { date: string; startTime: string; endTime: string },
): SessionFormValues {
  const isA = programmeCode === 'A'
  return {
    ...current,
    title: 'Welcoming visitors at the souq: service recovery workshop',
    level: isA ? 'Level 2' : '',
    stage: isA ? 'Trainer-led application' : '',
    prerequisite: isA ? 'a_level1_complete' : 'none',
    description:
      'A hands-on workshop for front-line hospitality staff. Practise greeting visitors in Arabic and English, handling a changed booking with two feasible options, and writing a clear follow-up message.',
    format: 'in_person',
    ...slot,
    capacity: '16',
    deadlineDate: addDays(slot.date, -1),
    deadlineTime: '17:00',
    venue: 'Demo Academy, West Bay training centre',
    room: 'Training Room 2',
    accessNote: 'Step-free entrance from the main lobby; lift to level 1. Prayer room on level 1.',
    meetingRef: 'DEMO-ROOM-WORKSHOP-2',
    joinInstructions:
      'Simulated online classroom. The join link is a placeholder: no real meeting room is created for this demonstration.',
    cancellationPolicy:
      current.cancellationPolicy ||
      'Self-service changes until 24 hours before the session. Later changes request admin review.',
    materials: 'Greeting practice card\nService recovery checklist\nFollow-up message template',
  }
}
