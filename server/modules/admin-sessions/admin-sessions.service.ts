import { db } from '@server/db/connection'
import {
  attendance,
  profiles,
  programmes,
  rsvps,
  sessionReschedules,
  sessions,
  trainerProfiles,
  user,
} from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { asc, desc, eq, sql } from 'drizzle-orm'

const countOf = (status: string) =>
  sql<number>`(select count(*)::int from ${rsvps} r where r.session_id = ${sessions.id} and r.status = ${status})`

export async function listSessions() {
  return db
    .select({
      id: sessions.id,
      code: sessions.code,
      title: sessions.title,
      programme: programmes.code,
      level: sessions.level,
      stage: sessions.stage,
      trainerId: sessions.trainerId,
      trainerCode: trainerProfiles.code,
      trainerName: trainerProfiles.fullName,
      format: sessions.format,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      timezone: sessions.timezone,
      capacity: sessions.capacity,
      venue: sessions.venue,
      room: sessions.room,
      meetingRef: sessions.meetingRef,
      status: sessions.status,
      isCompletionGate: sessions.isCompletionGate,
      confirmed: countOf('confirmed'),
      waitlisted: countOf('waitlisted'),
      cancelledRsvps: countOf('cancelled'),
      reschedules: sql<number>`(select count(*)::int from ${sessionReschedules} sr where sr.session_id = ${sessions.id})`,
      present: sql<number>`(select count(*)::int from ${attendance} a where a.session_id = ${sessions.id} and a.status in ('attended', 'late'))`,
      marked: sql<number>`(select count(*)::int from ${attendance} a where a.session_id = ${sessions.id} and a.status <> 'pending')`,
    })
    .from(sessions)
    .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
    .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
    .orderBy(asc(sessions.startsAt))
}

export async function getSession(sessionId: string) {
  const [row] = await db
    .select({
      id: sessions.id,
      description: sessions.description,
      accessNote: sessions.accessNote,
      joinInstructions: sessions.joinInstructions,
      bookingDeadline: sessions.bookingDeadline,
      cancellationPolicy: sessions.cancellationPolicy,
      prerequisite: sessions.prerequisite,
      cancelledReason: sessions.cancelledReason,
      materials: sessions.materials,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)
  if (!row) throw HttpError.notFound('Session not found')
  const [roster, reschedules] = await Promise.all([
    db
      .select({
        rsvpId: rsvps.id,
        learnerCode: profiles.learnerCode,
        name: profiles.fullName,
        status: rsvps.status,
        waitlistPosition: rsvps.waitlistPosition,
        bookedAt: rsvps.bookedAt,
        attendance: attendance.status,
      })
      .from(rsvps)
      .innerJoin(profiles, eq(profiles.userId, rsvps.learnerId))
      .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
      .where(eq(rsvps.sessionId, sessionId))
      .orderBy(asc(rsvps.status), asc(rsvps.waitlistPosition), asc(profiles.learnerCode)),
    db
      .select({
        id: sessionReschedules.id,
        previousStartsAt: sessionReschedules.previousStartsAt,
        newStartsAt: sessionReschedules.newStartsAt,
        previousVenue: sessionReschedules.previousVenue,
        newVenue: sessionReschedules.newVenue,
        reason: sessionReschedules.reason,
        affectedRsvps: sessionReschedules.affectedRsvps,
        eventId: sessionReschedules.eventId,
        changedBy: user.name,
        createdAt: sessionReschedules.createdAt,
      })
      .from(sessionReschedules)
      .leftJoin(user, eq(user.id, sessionReschedules.changedBy))
      .where(eq(sessionReschedules.sessionId, sessionId))
      .orderBy(desc(sessionReschedules.createdAt)),
  ])
  return { ...row, roster, reschedules }
}
