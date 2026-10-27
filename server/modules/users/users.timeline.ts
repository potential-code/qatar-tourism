import type { getUserDetail } from './users.service'

type Detail = Awaited<ReturnType<typeof getUserDetail>>

export type TimelineEntry = {
  id: string
  at: string
  kind:
    | 'account'
    | 'enrolment'
    | 'assessment'
    | 'practice'
    | 'booking'
    | 'attendance'
    | 'submission'
    | 'review'
    | 'certificate'
    | 'notification'
    | 'audit'
  title: string
  detail: string | null
}

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null)

/** One chronological history of a learner across every record type, newest first (brief §14). */
export function buildTimeline(detail: Detail): TimelineEntry[] {
  const out: TimelineEntry[] = []
  const push = (entry: Omit<TimelineEntry, 'at'> & { at: Date | null | undefined }) => {
    const at = iso(entry.at)
    if (at) out.push({ ...entry, at })
  }

  push({
    id: `account:${detail.account.id}`,
    at: detail.profile?.registeredAt ?? detail.account.createdAt,
    kind: 'account',
    title: 'Account registered',
    detail: detail.profile ? `Learner ID ${detail.profile.learnerCode}` : null,
  })
  for (const e of detail.enrolments) {
    push({
      id: `enrol:${e.id}`,
      at: e.enrolledAt,
      kind: 'enrolment',
      title: `Enrolled in Program ${e.programme}`,
      detail: e.assignmentReason,
    })
    push({
      id: `start:${e.id}`,
      at: e.startedAt,
      kind: 'enrolment',
      title: `Started Program ${e.programme}`,
      detail: null,
    })
    push({
      id: `done:${e.id}`,
      at: e.completedAt,
      kind: 'enrolment',
      title: `Completed Program ${e.programme}`,
      detail:
        e.programme === 'A'
          ? 'All Program A conditions passed'
          : 'Programme rules met; no certificate',
    })
  }
  for (const a of detail.attempts) {
    push({
      id: `attempt:${a.id}`,
      at: a.submittedAt,
      kind: 'assessment',
      title: `${a.title} submitted (Program ${a.programme})`,
      detail: a.score !== null ? `Score ${a.score} of 100, version ${a.version}` : null,
    })
  }
  for (const r of detail.rolePlays) {
    push({
      id: `play:${r.id}`,
      at: r.completedAt,
      kind: 'practice',
      title: `AI practice completed (${r.mode === 'voice' ? 'voice' : 'text'})`,
      detail: `Scenario ${r.scenarioKey}, score ${r.totalPercent} of 100`,
    })
  }
  for (const b of detail.bookings) {
    push({
      id: `rsvp:${b.id}`,
      at: b.bookedAt,
      kind: 'booking',
      title: `Booking ${b.status}: ${b.sessionTitle}`,
      detail: `${b.sessionCode} with ${b.trainer}`,
    })
    if (b.attendance && b.attendance !== 'pending')
      push({
        id: `attend:${b.id}`,
        at: b.markedAt ?? b.startsAt,
        kind: 'attendance',
        title: `Attendance recorded: ${b.attendance}`,
        detail: `${b.sessionCode} ${b.sessionTitle}`,
      })
  }
  for (const s of detail.submissions) {
    push({
      id: `sub:${s.id}`,
      at: s.submittedAt,
      kind: 'submission',
      title: `${s.assignment} submitted (version ${s.version})`,
      detail: null,
    })
    push({
      id: `review:${s.id}`,
      at: s.reviewedAt,
      kind: 'review',
      title:
        s.reviewStatus === 'approved' ? 'Assignment approved' : 'Assignment returned for revision',
      detail: s.score !== null ? `Score ${s.score} of 100` : null,
    })
  }
  for (const c of detail.certificates) {
    push({
      id: `cert:${c.id}`,
      at: c.issuedAt,
      kind: 'certificate',
      title: 'Certificate issued',
      detail: c.code,
    })
    push({
      id: `revoke:${c.id}`,
      at: c.revokedAt,
      kind: 'certificate',
      title: 'Certificate revoked',
      detail: c.code,
    })
  }
  for (const n of detail.notifications) {
    push({
      id: `note:${n.id}`,
      at: n.createdAt,
      kind: 'notification',
      title: n.subject,
      detail: `${n.channel === 'email' ? 'Demo email' : 'In-app'}: ${n.state}`,
    })
  }
  for (const a of detail.audit) {
    push({
      id: `audit:${a.id}`,
      at: a.createdAt,
      kind: 'audit',
      title: `Audit: ${a.action}`,
      detail: [a.actorLabel ? `${a.actorLabel} (${a.actorRole})` : a.actorRole, a.reason]
        .filter(Boolean)
        .join('. '),
    })
  }
  return out.sort((x, y) => y.at.localeCompare(x.at))
}
