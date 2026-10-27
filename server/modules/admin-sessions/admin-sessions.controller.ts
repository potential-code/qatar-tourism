import * as changeRequests from '@server/modules/rsvps/change-requests.service'
import type { Actor } from '@server/modules/sessions/actor'
import type { ChangeRequestDecisionInput } from '@shared/schemas/booking-rsvp'
import * as service from './admin-sessions.service'

const iso = (value: Date | null) => (value ? value.toISOString() : null)

export async function list() {
  const rows = await service.listSessions()
  return {
    items: rows.map((row) => ({
      ...row,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
    })),
  }
}

export async function detail(sessionId: string) {
  const d = await service.getSession(sessionId)
  return {
    ...d,
    bookingDeadline: iso(d.bookingDeadline),
    roster: d.roster.map((r) => ({ ...r, bookedAt: r.bookedAt.toISOString() })),
    reschedules: d.reschedules.map((r) => ({
      ...r,
      previousStartsAt: r.previousStartsAt.toISOString(),
      newStartsAt: r.newStartsAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

/** Late change requests (brief §6), newest first. */
export async function changeRequestList() {
  const rows = await changeRequests.listChangeRequests()
  return {
    items: rows.map((row) => ({
      ...row,
      requestedAt: row.requestedAt.toISOString(),
      session: { ...row.session, startsAt: row.session.startsAt.toISOString() },
      decision: row.decision ? { ...row.decision, at: row.decision.at.toISOString() } : null,
    })),
  }
}

export async function decideChangeRequest(
  actor: Actor,
  rsvpId: string,
  input: ChangeRequestDecisionInput,
) {
  const result = await changeRequests.decideChangeRequest(actor, rsvpId, input)
  return { ...result, decidedAt: result.decidedAt.toISOString() }
}
