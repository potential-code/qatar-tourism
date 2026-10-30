import { db, now } from '../api'

/**
 * Training history (SPEC §4): one chronological list across every programme the learner holds,
 * built from course progress and session bookings. A completed Program B course reads
 * "Completed — no programme certificate"; the unified record never turns Program B into a
 * certified programme.
 */

export type HistoryMode = 'video' | 'interactive' | 'resource' | 'preview' | 'in_person' | 'online'

export type HistoryStatus =
  | 'completed'
  | 'in_progress'
  | 'upcoming'
  | 'attended'
  | 'attendance_pending'
  | 'absent'
  | 'waitlisted'
  | 'cancelled'

export type HistoryResult =
  | { kind: 'score'; value: number }
  | { kind: 'completed' }
  | { kind: 'completed_no_certificate' }
  | { kind: 'attended' }
  | { kind: 'none' }

export interface HistoryAttempt {
  id: string
  title: string
  kind: string
  attemptNo: number
  score: number | null
  submittedAt: string | null
}

export interface HistoryFeedback {
  from: string
  text: string
  at: string | null
}

export type EvidenceKey =
  | 'completionStatus'
  | 'score'
  | 'minutesSpent'
  | 'completedOn'
  | 'attendance'
  | 'sessionScore'
  | 'venue'

export interface HistoryEvidence {
  key: EvidenceKey
  value: string | number
}

export interface HistoryRow {
  id: string
  kind: 'course' | 'session'
  programmeCode: string
  programmeTitle: string
  title: string
  mode: HistoryMode
  startedAt: string | null
  completedAt: string | null
  /** Sort key: the most recent date on the row. */
  sortAt: string
  progressPercent: number
  result: HistoryResult
  status: HistoryStatus
  detail: {
    attempts: HistoryAttempt[]
    feedback: HistoryFeedback[]
    evidence: HistoryEvidence[]
  }
}

export function trainingHistory(learnerId: string): HistoryRow[] {
  const nowIso = now().toISOString()
  const rows: HistoryRow[] = []
  const enrolments = db.enrolments.filter((e) => e.learnerId === learnerId)

  for (const enrolment of enrolments) {
    const programme = db.programmes.find((p) => p.id === enrolment.programmeId)
    if (!programme) continue
    const attempts: HistoryAttempt[] = db.assessmentAttempts
      .filter((a) => a.enrolmentId === enrolment.id && a.status === 'submitted')
      .map((a) => {
        const assessment = db.assessments.find((x) => x.id === a.assessmentId)
        return {
          id: a.id,
          title: assessment?.title ?? 'Assessment',
          kind: assessment?.kind ?? 'formative',
          attemptNo: a.attemptNo,
          score: a.score,
          submittedAt: a.submittedAt,
        }
      })
      .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''))

    for (const unit of db.unitProgress.filter((u) => u.enrolmentId === enrolment.id)) {
      if (unit.status === 'not_started' && unit.percent === 0) continue
      const course = db.courses.find((c) => c.id === unit.courseId)
      if (!course) continue
      const completed = unit.status === 'completed'
      const mode: HistoryMode = course.format === 'session' ? 'in_person' : course.format
      rows.push({
        id: `unit:${unit.id}`,
        kind: 'course',
        programmeCode: programme.code,
        programmeTitle: programme.title,
        title: course.title,
        mode,
        startedAt: unit.createdAt,
        completedAt: unit.completedAt,
        sortAt: unit.completedAt ?? unit.lastActivityAt ?? unit.createdAt,
        progressPercent: unit.percent,
        result: !completed
          ? { kind: 'none' }
          : !programme.certificationEnabled
            ? { kind: 'completed_no_certificate' }
            : unit.scoreRaw !== null
              ? { kind: 'score', value: unit.scoreRaw }
              : { kind: 'completed' },
        status: completed ? 'completed' : 'in_progress',
        detail: {
          attempts,
          feedback: [],
          evidence: [
            { key: 'completionStatus', value: completed ? 'completed' : 'in_progress' },
            ...(unit.scoreRaw !== null ? [{ key: 'score' as const, value: unit.scoreRaw }] : []),
            ...(unit.sessionTimeSeconds > 0
              ? [{ key: 'minutesSpent' as const, value: Math.round(unit.sessionTimeSeconds / 60) }]
              : []),
            ...(unit.completedAt ? [{ key: 'completedOn' as const, value: unit.completedAt }] : []),
          ],
        },
      })
    }

    // Sessions of this programme the learner booked.
    for (const rsvp of db.rsvps.filter((r) => r.learnerId === learnerId)) {
      const session = db.sessions.find((s) => s.id === rsvp.sessionId)
      if (!session || session.programmeId !== enrolment.programmeId) continue
      const attendance = db.attendance.find((a) => a.rsvpId === rsvp.id)
      const score = db.sessionScores.find((s) => s.rsvpId === rsvp.id && s.status === 'final')
      const future = session.startsAt > nowIso
      const attended = attendance?.status === 'attended' || attendance?.status === 'late'
      const status: HistoryStatus =
        rsvp.status === 'waitlisted' || rsvp.status === 'offered'
          ? 'waitlisted'
          : rsvp.status === 'cancelled' || rsvp.status === 'moved'
            ? 'cancelled'
            : attended
              ? 'attended'
              : attendance?.status === 'absent' || attendance?.status === 'excused'
                ? 'absent'
                : future
                  ? 'upcoming'
                  : 'attendance_pending'
      const trainer = db.users.find((u) => u.id === score?.scoredBy)
      rows.push({
        id: `session:${rsvp.id}`,
        kind: 'session',
        programmeCode: programme.code,
        programmeTitle: programme.title,
        title: session.title,
        mode: session.format,
        startedAt: session.startsAt,
        completedAt: attended ? session.endsAt : null,
        sortAt: session.startsAt,
        progressPercent: attended ? 100 : 0,
        result: score
          ? { kind: 'score', value: score.total }
          : attended
            ? { kind: 'attended' }
            : { kind: 'none' },
        status,
        detail: {
          attempts,
          feedback: score?.feedback
            ? [{ from: trainer?.name ?? '', text: score.feedback, at: score.finalisedAt }]
            : [],
          evidence: [
            ...(attendance ? [{ key: 'attendance' as const, value: attendance.status }] : []),
            ...(score ? [{ key: 'sessionScore' as const, value: score.total }] : []),
            ...(session.venue ? [{ key: 'venue' as const, value: session.venue }] : []),
          ],
        },
      })
    }
  }
  return rows.sort((a, b) => b.sortAt.localeCompare(a.sortAt))
}
