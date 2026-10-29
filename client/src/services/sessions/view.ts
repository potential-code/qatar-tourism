import { ms, type SessionCard } from './store'

const iso = (value: string) => new Date(value).toISOString()

/** The wire shape of a session, used by learner and trainer screens alike. */
export function toSessionView(card: SessionCard) {
  const s = card.session
  const seatsRemaining = Math.max(0, s.capacity - card.confirmed)
  return {
    id: s.id,
    code: s.code,
    title: s.title,
    description: s.description,
    programmeId: s.programmeId,
    programmeCode: card.programmeCode,
    programmeTitle: card.programmeTitle,
    level: s.level,
    stage: s.stage,
    trainer: {
      id: s.trainerId,
      code: card.trainerCode,
      name: card.trainerName,
      headline: card.trainerHeadline,
      avatarPath: card.trainerAvatar,
    },
    format: s.format,
    startsAt: iso(s.startsAt),
    endsAt: iso(s.endsAt),
    durationMinutes: Math.round((ms(s.endsAt) - ms(s.startsAt)) / 60_000),
    timezone: s.timezone,
    capacity: s.capacity,
    confirmed: card.confirmed,
    waitlisted: card.waitlisted,
    seatsRemaining,
    venue: s.venue,
    room: s.room,
    accessNote: s.accessNote,
    meetingRef: s.meetingRef,
    joinInstructions: s.joinInstructions,
    bookingDeadline: s.bookingDeadline ? iso(s.bookingDeadline) : null,
    cancellationPolicy: s.cancellationPolicy,
    materials: s.materials,
    prerequisite: s.prerequisite,
    isCompletionGate: s.isCompletionGate,
    status: s.status,
    cancelledReason: s.cancelledReason,
  }
}

export type SessionView = ReturnType<typeof toSessionView>
