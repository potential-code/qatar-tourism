import { db, now } from '../api'
import { ms } from './store'

/**
 * Confirmed RSVPs on sessions that have started and have no attendance (or pending), per
 * session. Feeds the trainer's session list, the overview and the attendance index.
 */
export function outstandingAttendanceBySession(sessionIds: string[]): Map<string, number> {
  const result = new Map<string, number>()
  if (sessionIds.length === 0) return result
  const wanted = new Set(sessionIds)
  const at = now().getTime()
  const started = new Set(
    db.sessions
      .filter((s) => wanted.has(s.id) && s.status !== 'cancelled' && ms(s.startsAt) <= at)
      .map((s) => s.id),
  )
  if (started.size === 0) return result
  const marked = new Map(db.attendance.map((a) => [a.rsvpId, a.status]))
  for (const r of db.rsvps) {
    if (r.status !== 'confirmed' || !started.has(r.sessionId)) continue
    const status = marked.get(r.id)
    if (status && status !== 'pending') continue
    result.set(r.sessionId, (result.get(r.sessionId) ?? 0) + 1)
  }
  return result
}
