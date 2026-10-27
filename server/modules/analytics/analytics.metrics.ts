import { COMPETENCIES, type ProgrammeCode, THRESHOLDS } from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import { type CohortFilters, cohortKeys } from './analytics.filters'
import type { EnrolmentFact, Facts, SessionFact } from './analytics.types'

/**
 * Governed metrics (brief §12 "Metric definitions"). Pure functions over the facts: one
 * definition each, used by the Dashboard, the Reports and the Demo analytics assistant alike.
 */

const DAY_MS = 86_400_000
export const PROGRAMMES: readonly ProgrammeCode[] = ['A', 'B', 'C']

const pct = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10
const mean = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
const round1 = (value: number) => Math.round(value * 10) / 10
const avg = (values: readonly number[]) => round1(mean(values))

export const daysSince = (at: Date | null, asOf: Date) =>
  at ? Math.floor((asOf.getTime() - at.getTime()) / DAY_MS) : null

// ---------------------------------------------------------------------------------------------
// Headline counts
// ---------------------------------------------------------------------------------------------

/** Unique learners = distinct learner IDs in the selected cohort. */
export const uniqueLearners = (rows: readonly EnrolmentFact[]) =>
  new Set(rows.map((row) => row.learnerId)).size

/** Enrolments = programme registrations, allowing more than one per learner. */
export const enrolmentCount = (rows: readonly EnrolmentFact[]) => rows.length

/** Active learner = at least one recorded learning activity in the last 30 days as of `asOf`. */
export function isActive(row: EnrolmentFact, asOf: Date) {
  const days = daysSince(row.lastActivityAt, asOf)
  return days !== null && days < THRESHOLDS.activeLearnerDays
}

export const activeLearners = (rows: readonly EnrolmentFact[], asOf: Date) =>
  new Set(rows.filter((row) => isActive(row, asOf)).map((row) => row.learnerId)).size

export const completions = (rows: readonly EnrolmentFact[]) =>
  rows.filter((row) => row.status === 'completed').length

/** Completion rate = completed enrolments / eligible enrolments in the same filtered cohort. */
export const completionRate = (rows: readonly EnrolmentFact[]) =>
  pct(completions(rows), rows.length)

/** Certificate count = issued, non-revoked Program A certificates. */
export const certificateCount = (rows: readonly EnrolmentFact[]) =>
  rows.filter((row) => row.programme === 'A' && row.certificateIssued).length

/** Pending assessments = latest submissions submitted or under review, awaiting a trainer. */
export const isPendingMarking = (row: EnrolmentFact) =>
  row.submission?.status === 'submitted' || row.submission?.status === 'under_review'

export const pendingAssessments = (rows: readonly EnrolmentFact[]) =>
  rows.filter(isPendingMarking).length

/** Upcoming sessions: published or full, starting after `asOf`. Responds to the programme filter. */
export function upcomingSessions(facts: Facts, filters: CohortFilters): SessionFact[] {
  return facts.sessions.filter(
    (s) =>
      s.startsAt > facts.asOf &&
      (s.status === 'published' || s.status === 'full') &&
      (!filters.programme || s.programme === filters.programme),
  )
}

// ---------------------------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------------------------

/**
 * Attendance rate = attended or late records / due non-cancelled session bookings. "Due" means
 * the session has started. Only bookings by learners whose enrolment in that session's
 * programme is in the cohort count.
 */
export function attendanceRecords(facts: Facts, rows: readonly EnrolmentFact[]) {
  const keys = cohortKeys(rows)
  return facts.attendance.filter(
    (a) =>
      a.sessionStatus !== 'cancelled' &&
      a.startsAt <= facts.asOf &&
      keys.has(`${a.learnerId}:${a.programme}`),
  )
}

export function attendanceRate(facts: Facts, rows: readonly EnrolmentFact[]) {
  const due = attendanceRecords(facts, rows)
  const present = due.filter((a) => a.status === 'attended' || a.status === 'late').length
  return { rate: pct(present, due.length), present, due: due.length }
}

export function attendanceByFormat(facts: Facts, rows: readonly EnrolmentFact[]) {
  const due = attendanceRecords(facts, rows)
  return (['in_person', 'online'] as const).map((format) => {
    const subset = due.filter((a) => a.format === format)
    const present = subset.filter((a) => a.status === 'attended' || a.status === 'late').length
    return {
      format,
      label: format === 'in_person' ? 'In person' : 'Live online',
      rate: pct(present, subset.length),
      present,
      due: subset.length,
      absent: subset.filter((a) => a.status === 'absent').length,
      excused: subset.filter((a) => a.status === 'excused').length,
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Programme distribution and funnel
// ---------------------------------------------------------------------------------------------

export function distribution(rows: readonly EnrolmentFact[]) {
  return PROGRAMMES.map((code) => {
    const subset = rows.filter((row) => row.programme === code)
    return { programme: code, enrolments: subset.length, learners: uniqueLearners(subset) }
  })
}

type FunnelStep = { key: string; label: string; test: (row: EnrolmentFact) => boolean }

const started = (row: EnrolmentFact) => row.status !== 'not_started'
const completed = (row: EnrolmentFact) => row.status === 'completed'

/** Programme-specific steps (brief §12): B and C never show a certification step. */
export const FUNNEL_STEPS: Record<ProgrammeCode, readonly FunnelStep[]> = {
  A: [
    { key: 'enrolled', label: 'Enrolled', test: () => true },
    { key: 'started', label: 'Started', test: started },
    {
      key: 'learning',
      label: 'Level 1 learning complete',
      test: (row) => (row.foundation?.score ?? 0) >= THRESHOLDS.foundationQuizPass,
    },
    {
      key: 'practical',
      label: 'Session attended and assignment submitted',
      test: (row) => row.completedUnits.has('C06') && row.submission !== null,
    },
    { key: 'completed', label: 'Completed and certified', test: completed },
  ],
  B: [
    { key: 'enrolled', label: 'Enrolled', test: () => true },
    { key: 'started', label: 'Started', test: started },
    {
      key: 'learning',
      label: 'Core lessons complete',
      test: (row) => ['C01', 'C02', 'C03'].every((code) => row.completedUnits.has(code)),
    },
    {
      key: 'practical',
      label: 'Practice and short response submitted',
      test: (row) => row.hasRolePlay && row.submission !== null,
    },
    { key: 'completed', label: 'Completed (no certificate)', test: completed },
  ],
  C: [
    { key: 'enrolled', label: 'Enrolled', test: () => true },
    { key: 'started', label: 'Started', test: started },
    { key: 'completed', label: 'Sample overview complete', test: completed },
  ],
}

/** Furthest step an enrolment has reached; a later step implies every earlier one. */
export function funnelReach(row: EnrolmentFact): number {
  const steps = FUNNEL_STEPS[row.programme]
  for (let index = steps.length - 1; index >= 0; index--) {
    if (steps[index]?.test(row)) return index
  }
  return 0
}

export function funnel(rows: readonly EnrolmentFact[], programme: ProgrammeCode) {
  const subset = rows.filter((row) => row.programme === programme)
  const reach = subset.map(funnelReach)
  return FUNNEL_STEPS[programme].map((step, index) => {
    const value = reach.filter((r) => r >= index).length
    return { key: step.key, label: step.label, value, share: pct(value, subset.length) }
  })
}

// ---------------------------------------------------------------------------------------------
// Learning improvement (paired pre/post)
// ---------------------------------------------------------------------------------------------

export const hasPair = (row: EnrolmentFact) => row.pre !== null && row.post !== null

export function improvement(rows: readonly EnrolmentFact[]) {
  const pairs = rows.filter(hasPair)
  const summarise = (subset: readonly EnrolmentFact[]) => {
    const pre = mean(subset.map((row) => row.pre?.score ?? 0))
    const post = mean(subset.map((row) => row.post?.score ?? 0))
    const versions = [
      ...new Set(subset.map((row) => `${row.pre?.version ?? '?'} / ${row.post?.version ?? '?'}`)),
    ]
    // Gain from the unrounded means, so it matches the average of per-learner gains in Reports.
    return {
      n: subset.length,
      pre: round1(pre),
      post: round1(post),
      gain: round1(post - pre),
      versions,
    }
  }
  const competencies = COMPETENCIES.map((key) => {
    const value = (row: EnrolmentFact, which: 'pre' | 'post') =>
      ((row[which]?.competencyScores?.[key] ?? 0) / 20) * 100
    const pre = mean(pairs.map((row) => value(row, 'pre')))
    const post = mean(pairs.map((row) => value(row, 'post')))
    return {
      key,
      label: COMPETENCY_LABELS[key],
      pre: round1(pre),
      post: round1(post),
      gain: round1(post - pre),
    }
  })
  return {
    overall: summarise(pairs),
    byProgramme: PROGRAMMES.map((programme) => ({
      programme,
      ...summarise(pairs.filter((row) => row.programme === programme)),
    })).filter((entry) => entry.n > 0),
    competencies,
  }
}

// ---------------------------------------------------------------------------------------------
// Operational panels
// ---------------------------------------------------------------------------------------------

export function sessionsNearingCapacity(facts: Facts, filters: CohortFilters, threshold = 0.8) {
  return upcomingSessions(facts, filters)
    .map((s) => ({ ...s, fill: s.capacity > 0 ? s.confirmed / s.capacity : 0 }))
    .filter((s) => s.fill >= threshold)
    .sort((a, b) => b.fill - a.fill || a.startsAt.getTime() - b.startsAt.getTime())
}

/** Trainer marking backlog: latest submissions awaiting each marker, plus draft session scores. */
export function markingBacklog(facts: Facts, rows: readonly EnrolmentFact[]) {
  const pending = rows.filter(isPendingMarking)
  return facts.trainers
    .map((trainer) => {
      const mine = pending.filter((row) => row.submission?.markerTrainerId === trainer.id)
      const drafts = facts.draftScores.filter((d) => d.trainerId === trainer.id)
      const waits = mine.map(
        (row) => daysSince(row.submission?.submittedAt ?? null, facts.asOf) ?? 0,
      )
      return {
        trainerId: trainer.id,
        trainerCode: trainer.code,
        trainerName: trainer.name,
        submissions: mine.length,
        draftScores: drafts.length,
        total: mine.length + drafts.length,
        oldestDays: waits.length ? Math.max(...waits) : 0,
        overdue: waits.filter((d) => d > THRESHOLDS.markingOverdueDays).length,
      }
    })
    .sort((a, b) => b.total - a.total || b.oldestDays - a.oldestDays)
}

/**
 * Learners inactive 14 days: an open (not completed) enrolment whose last recorded activity is
 * 14 or more days before `asOf`. Learners who have never started are not counted here.
 */
export function inactiveLearners(rows: readonly EnrolmentFact[], asOf: Date) {
  const byLearner = new Map<string, { row: EnrolmentFact; days: number }>()
  for (const row of rows) {
    if (row.status === 'completed') continue
    const days = daysSince(row.lastActivityAt, asOf)
    if (days === null || days < THRESHOLDS.inactiveLearnerDays) continue
    const prev = byLearner.get(row.learnerId)
    if (!prev || prev.days > days) byLearner.set(row.learnerId, { row, days })
  }
  return [...byLearner.values()].sort((a, b) => b.days - a.days)
}

// ---------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------

export function programmePerformance(rows: readonly EnrolmentFact[], asOf: Date) {
  return PROGRAMMES.map((programme) => {
    const subset = rows.filter((row) => row.programme === programme)
    const pairs = subset.filter(hasPair)
    const pre = avg(pairs.map((row) => row.pre?.score ?? 0))
    const post = avg(pairs.map((row) => row.post?.score ?? 0))
    return {
      programme,
      enrolments: subset.length,
      learners: uniqueLearners(subset),
      active: activeLearners(subset, asOf),
      notStarted: subset.filter((row) => row.status === 'not_started').length,
      inProgress: subset.filter((row) => row.status === 'in_progress').length,
      awaitingReview: subset.filter((row) => row.status === 'awaiting_review').length,
      completed: completions(subset),
      completionRate: completionRate(subset),
      averageProgress: avg(subset.map((row) => row.progress)),
      pairs: pairs.length,
      pre,
      post,
      gain: Math.round((post - pre) * 10) / 10,
      /** Null when the programme does not certify (B and C). */
      certificates: programme === 'A' ? certificateCount(subset) : null,
      pendingMarking: pendingAssessments(subset),
    }
  }).filter((row) => row.enrolments > 0)
}

export type AttentionReason =
  | 'inactive'
  | 'failed_prerequisite'
  | 'absent'
  | 'revision_requested'
  | 'overdue_marking'

export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  inactive: 'Inactive 14+ days',
  failed_prerequisite: 'Foundation quiz below pass mark',
  absent: 'Absent from session',
  revision_requested: 'Assignment returned for revision',
  overdue_marking: 'Marking overdue',
}

/** Learners requiring attention: one row per enrolment with at least one reason. */
export function attentionList(facts: Facts, rows: readonly EnrolmentFact[]) {
  const absentees = new Set(
    facts.attendance
      .filter((a) => a.status === 'absent')
      .map((a) => `${a.learnerId}:${a.programme}`),
  )
  const out: { row: EnrolmentFact; reasons: AttentionReason[]; inactiveDays: number | null }[] = []
  for (const row of rows) {
    if (row.status === 'completed') continue
    const reasons: AttentionReason[] = []
    const inactiveDays = daysSince(row.lastActivityAt, facts.asOf)
    if (inactiveDays !== null && inactiveDays >= THRESHOLDS.inactiveLearnerDays)
      reasons.push('inactive')
    if (
      row.foundation &&
      row.foundation.score < THRESHOLDS.foundationQuizPass &&
      row.programme === 'A'
    )
      reasons.push('failed_prerequisite')
    if (absentees.has(`${row.learnerId}:${row.programme}`) && !row.completedUnits.has('C06'))
      reasons.push('absent')
    if (row.submission?.status === 'returned') reasons.push('revision_requested')
    if (
      isPendingMarking(row) &&
      (daysSince(row.submission?.submittedAt ?? null, facts.asOf) ?? 0) >
        THRESHOLDS.markingOverdueDays
    )
      reasons.push('overdue_marking')
    if (reasons.length) out.push({ row, reasons, inactiveDays })
  }
  return out
}

export function organisationCompletion(rows: readonly EnrolmentFact[]) {
  const byOrg = new Map<string, EnrolmentFact[]>()
  for (const row of rows) {
    if (!row.organisationId) continue
    const list = byOrg.get(row.organisationId) ?? []
    list.push(row)
    byOrg.set(row.organisationId, list)
  }
  return [...byOrg.entries()].map(([organisationId, subset]) => ({
    organisationId,
    organisationName: subset[0]?.organisationName ?? 'Unknown',
    organisationType: subset[0]?.organisationType ?? null,
    enrolments: subset.length,
    completed: completions(subset),
    rate: completionRate(subset),
  }))
}

/** Weekly new registrations (unique learners) over the last 13 weeks to `asOf`. */
export function registrationTrend(rows: readonly EnrolmentFact[], asOf: Date) {
  const weeks = 13
  const start = asOf.getTime() - weeks * 7 * DAY_MS
  const firstSeen = new Map<string, Date>()
  for (const row of rows) firstSeen.set(row.learnerId, row.registeredAt)
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    key: new Date(start + index * 7 * DAY_MS).toISOString().slice(0, 10),
    value: 0,
  }))
  for (const at of firstSeen.values()) {
    const index = Math.floor((at.getTime() - start) / (7 * DAY_MS))
    const bucket = buckets[index]
    if (bucket) bucket.value += 1
  }
  return buckets
}
