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
