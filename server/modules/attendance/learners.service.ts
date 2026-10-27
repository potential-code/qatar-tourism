import { db } from '@server/db/connection'
import { attendance, profiles, rsvps, sessionScores, sessions } from '@server/db/schema'
import type { Scope } from '@server/middleware/scope.middleware'
import { THRESHOLDS } from '@shared/constants'
import { pickVisibleLearnerFields } from '@shared/permissions'
import type { Role } from '@shared/roles'
import { desc, eq } from 'drizzle-orm'

/**
 * Assigned learners (brief §10): the learners booked on the trainer's sessions, with limited
 * fields only. An admin calling this sees every booked learner (capped for the screen).
 */
export async function assignedLearners(scope: Scope, role: Role) {
  const rows = await db
    .select({
      learnerId: rsvps.learnerId,
      rsvpStatus: rsvps.status,
      bookedAt: rsvps.bookedAt,
      sessionId: sessions.id,
      sessionCode: sessions.code,
      sessionTitle: sessions.title,
      sessionStatus: sessions.status,
      startsAt: sessions.startsAt,
      learnerCode: profiles.learnerCode,
      fullName: profiles.fullName,
      attendance: attendance.status,
      scoreTotal: sessionScores.total,
      scoreStatus: sessionScores.status,
    })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
    .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
    .leftJoin(sessionScores, eq(sessionScores.rsvpId, rsvps.id))
    .where(scope.kind === 'trainer' ? eq(sessions.trainerId, scope.trainerId) : undefined)
    .orderBy(desc(sessions.startsAt))
    .limit(scope.kind === 'trainer' ? 2000 : 500)

  const byLearner = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = byLearner.get(row.learnerId) ?? []
    list.push(row)
    byLearner.set(row.learnerId, list)
  }

  const items = [...byLearner.values()].map((bookings) => {
    const first = bookings[0] as (typeof rows)[number]
    const visible = pickVisibleLearnerFields(role, {
      learnerCode: first.learnerCode ?? 'Unknown',
      displayName: first.fullName ?? 'Learner',
    })
    const scored = bookings.find((b) => b.scoreTotal !== null)
    const latest = first
    return {
      learnerCode: String(visible.learnerCode ?? ''),
      displayName: String(visible.displayName ?? ''),
      latestSession: {
        id: latest.sessionId,
        code: latest.sessionCode,
        title: latest.sessionTitle,
        status: latest.sessionStatus,
        startsAt: latest.startsAt.toISOString(),
        rsvpStatus: latest.rsvpStatus,
      },
      bookings: bookings.length,
      attendance: scored?.attendance ?? latest.attendance ?? null,
      score: scored
        ? {
            total: scored.scoreTotal as number,
            status: scored.scoreStatus,
            passed: (scored.scoreTotal as number) >= THRESHOLDS.sessionPass,
          }
        : null,
    }
  })
  items.sort((a, b) => a.learnerCode.localeCompare(b.learnerCode))
  return { items, total: items.length }
}
