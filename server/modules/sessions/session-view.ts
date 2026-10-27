import type { SessionCard } from './session-store'

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
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    durationMinutes: Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000),
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
    bookingDeadline: s.bookingDeadline ? s.bookingDeadline.toISOString() : null,
    cancellationPolicy: s.cancellationPolicy,
    materials: s.materials,
    prerequisite: s.prerequisite,
    isCompletionGate: s.isCompletionGate,
    status: s.status,
    cancelledReason: s.cancelledReason,
  }
}

export type SessionView = ReturnType<typeof toSessionView>
