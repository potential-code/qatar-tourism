import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import { labelOf, ORGANISATION_TYPE_LABELS, PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { cohort } from '../analytics/analytics.filters'
import * as m from '../analytics/analytics.metrics'
import { METRICS } from '../analytics/analytics.registry'
import type { EnrolmentFact, Facts } from '../analytics/analytics.types'
import type { Intent } from './ai-analytics.intents'

/** The parts of an answer an intent builder decides; the controller adds id, time and labels. */
export type Built = Pick<
  AnalyticsAnswer,
  | 'title'
  | 'prose'
  | 'chart'
  | 'table'
  | 'filters'
  | 'definition'
  | 'period'
  | 'sampleSize'
  | 'records'
>

const n = (value: number) => value.toLocaleString('en-GB')
const pctText = (value: number) => `${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`
const signed = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}`

function listSentence(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

function programmeFilter(programme: ProgrammeCode | null) {
  return programme ? [{ label: 'Programme', value: PROGRAMME_LABELS[programme] }] : []
}

const allTime = (_facts: Facts, ref: string) =>
  `All seeded and recorded activity up to the demo reporting date, ${ref} (Qatar time).`

/** Minimum enrolments for an organisation to be ranked, so a tiny base cannot top a list. */
const MIN_ORG_SAMPLE = 15

export function build(
  intent: Intent,
  programme: ProgrammeCode | null,
  facts: Facts,
  ref: string,
): Built {
  const rows = cohort(facts, programme ? { programme } : {})
  const period = allTime(facts, ref)

  switch (intent) {
    case 'programme_distribution': {
      const all = cohort(facts, {})
      const dist = m.distribution(all)
      const parts = dist.map((d) => `${PROGRAMME_LABELS[d.programme]} has ${n(d.enrolments)}`)
      return {
        title: 'Learners by programme',
        prose: `There are ${n(m.uniqueLearners(all))} unique learners and ${n(all.length)} programme enrolments. ${listSentence(parts)}.`,
        chart: {
          type: 'column',
          label: 'Enrolments',
          unit: 'count',
          data: dist.map((d) => ({ label: PROGRAMME_LABELS[d.programme], value: d.enrolments })),
        },
        table: {
          columns: [
            { key: 'programme', header: 'Programme' },
            { key: 'enrolments', header: 'Enrolments', numeric: true },
            { key: 'learners', header: 'Unique learners', numeric: true },
            { key: 'share', header: 'Share of enrolments', numeric: true },
          ],
          rows: dist.map((d) => ({
            programme: PROGRAMME_LABELS[d.programme],
            enrolments: d.enrolments,
            learners: d.learners,
            share: pctText(all.length ? Math.round((d.enrolments / all.length) * 1000) / 10 : 0),
          })),
        },
        filters: [{ label: 'Cohort', value: 'All programmes' }],
        definition: `${METRICS.enrolments.label}: ${METRICS.enrolments.definition} ${METRICS.uniqueLearners.label}: ${METRICS.uniqueLearners.definition}`,
        period,
        sampleSize: { label: 'Enrolments', value: all.length },
        records: { label: 'View all learners', report: 'learners', search: {} },
      }
    }

    case 'lowest_completion_orgs': {
      const ranked = m
        .organisationCompletion(rows)
        .filter((o) => o.enrolments >= MIN_ORG_SAMPLE)
        .sort((a, b) => a.rate - b.rate || b.enrolments - a.enrolments)
      const bottom = ranked.slice(0, 5)
      const first = bottom[0]
      return {
        title: 'Lowest completion rate by organisation',
        prose: first
          ? `${first.organisationName} has the lowest completion rate at ${pctText(first.rate)} (${n(first.completed)} of ${n(first.enrolments)} enrolments). ${bottom
              .slice(1, 3)
              .map((o) => `${o.organisationName} follows at ${pctText(o.rate)}`)
              .join(
                '; ',
              )}. Organisations with fewer than ${MIN_ORG_SAMPLE} enrolments are not ranked.`
          : 'No organisation has enough enrolments to rank.',
        chart: {
          type: 'bar',
          label: 'Completion rate',
          unit: 'percent',
          data: bottom.map((o) => ({ label: o.organisationName, value: o.rate })),
        },
        table: {
          columns: [
            { key: 'organisation', header: 'Organisation' },
            { key: 'type', header: 'Type' },
            { key: 'enrolments', header: 'Enrolments', numeric: true },
            { key: 'completed', header: 'Completed', numeric: true },
            { key: 'rate', header: 'Completion rate', numeric: true },
          ],
          rows: bottom.map((o) => ({
            organisation: o.organisationName,
            type: labelOf(ORGANISATION_TYPE_LABELS, o.organisationType),
            enrolments: o.enrolments,
            completed: o.completed,
            rate: pctText(o.rate),
          })),
        },
        filters: [
          ...programmeFilter(programme),
          { label: 'Minimum sample', value: `${MIN_ORG_SAMPLE} enrolments per organisation` },
        ],
        definition: `${METRICS.completionRate.label}: ${METRICS.completionRate.definition}`,
        period,
        sampleSize: {
          label: 'Enrolments in ranked organisations',
          value: ranked.reduce((sum, o) => sum + o.enrolments, 0),
        },
        records: first
          ? {
              label: `View ${first.organisationName} learners`,
              report: 'learners',
              search: { organisationId: first.organisationId, ...(programme ? { programme } : {}) },
            }
          : null,
      }
    }

    case 'pre_post': {
      const code = programme ?? 'B'
      const subset = cohort(facts, { programme: code })
      const imp = m.improvement(subset)
      const o = imp.overall
      return {
        title: `Pre and post scores, ${PROGRAMME_LABELS[code]}`,
        prose:
          o.n === 0
            ? `${PROGRAMME_LABELS[code]} has no paired pre and post scores yet.`
            : `${n(o.n)} ${PROGRAMME_LABELS[code]} learners have a paired pre and post score. They averaged ${o.pre} before and ${o.post} after: a gain of ${signed(o.gain)} percentage points (assessment version ${o.versions.join(', ')}). The largest competency gain is ${[...imp.competencies].sort((a, b) => b.gain - a.gain)[0]?.label ?? 'not available'}.`,
        chart: {
          type: 'grouped',
          unit: 'percent',
          series: [
            { key: 'pre', label: 'Pre' },
            { key: 'post', label: 'Post' },
          ],
          data: imp.competencies.map((c) => ({ label: c.label, pre: c.pre, post: c.post })),
        },
        table: {
          columns: [
            { key: 'competency', header: 'Competency' },
            { key: 'pre', header: 'Pre average', numeric: true },
            { key: 'post', header: 'Post average', numeric: true },
            { key: 'gain', header: 'Gain (pp)', numeric: true },
          ],
          rows: [
            ...imp.competencies.map((c) => ({
              competency: c.label,
              pre: pctText(c.pre),
              post: pctText(c.post),
              gain: signed(c.gain),
            })),
            {
              competency: 'Overall score',
              pre: pctText(o.pre),
              post: pctText(o.post),
              gain: signed(o.gain),
            },
          ],
        },
        filters: [
          { label: 'Programme', value: PROGRAMME_LABELS[code] },
          { label: 'Assessment version', value: o.versions.join(', ') || 'v1 / v1' },
        ],
        definition: `${METRICS.improvement.label}: ${METRICS.improvement.definition}`,
        period,
        sampleSize: { label: 'Paired learners', value: o.n },
        records: {
          label: 'View assessment records',
          report: 'assessments',
          search: { programme: code },
        },
      }
    }

    case 'trainers_unmarked': {
      const backlog = m.markingBacklog(facts, rows).filter((b) => b.submissions > 0)
      const total = backlog.reduce((sum, b) => sum + b.submissions, 0)
      const top = backlog[0]
      return {
        title: 'Trainers with unmarked assignments',
        prose: top
          ? `${backlog.length} trainers have unmarked assignments: ${n(total)} submissions in total. ${top.trainerName} has the most (${top.submissions}, oldest waiting ${top.oldestDays} days). ${n(backlog.reduce((s, b) => s + b.overdue, 0))} submissions have waited more than ${THRESHOLDS.markingOverdueDays} days.`
          : 'No trainer has unmarked assignments.',
        chart: {
          type: 'bar',
          label: 'Unmarked submissions',
          unit: 'count',
          data: backlog.map((b) => ({ label: b.trainerName, value: b.submissions })),
        },
        table: {
          columns: [
            { key: 'trainer', header: 'Trainer' },
            { key: 'submissions', header: 'Unmarked', numeric: true },
            { key: 'overdue', header: `Over ${THRESHOLDS.markingOverdueDays} days`, numeric: true },
            { key: 'oldest', header: 'Oldest wait (days)', numeric: true },
            { key: 'drafts', header: 'Draft session scores', numeric: true },
          ],
          rows: backlog.map((b) => ({
            trainer: `${b.trainerName} (${b.trainerCode})`,
            submissions: b.submissions,
            overdue: b.overdue,
            oldest: b.oldestDays,
            drafts: b.draftScores,
          })),
        },
        filters: programmeFilter(programme),
        definition: `${METRICS.pendingAssessments.label}: ${METRICS.pendingAssessments.definition}`,
        period,
        sampleSize: { label: 'Unmarked submissions', value: total },
        records: {
          label: 'View pending submissions',
          report: 'assignments',
          search: { view: 'pending', ...(programme ? { programme } : {}) },
        },
      }
    }

    case 'attendance_by_format': {
      const byFormat = m.attendanceByFormat(facts, rows)
      const overall = m.attendanceRate(facts, rows)
      return {
        title: 'Attendance by delivery format',
        prose: `Overall attendance is ${pctText(overall.rate)} (${n(overall.present)} of ${n(overall.due)} due bookings). ${byFormat
          .map((f) => `${f.label}: ${pctText(f.rate)} of ${n(f.due)}`)
          .join('. ')}. Cancelled sessions are excluded.`,
        chart: {
          type: 'column',
          label: 'Attendance rate',
          unit: 'percent',
          data: byFormat.map((f) => ({ label: f.label, value: f.rate })),
        },
        table: {
          columns: [
            { key: 'format', header: 'Format' },
            { key: 'due', header: 'Due bookings', numeric: true },
            { key: 'present', header: 'Attended or late', numeric: true },
            { key: 'absent', header: 'Absent', numeric: true },
            { key: 'excused', header: 'Excused', numeric: true },
            { key: 'rate', header: 'Attendance rate', numeric: true },
          ],
          rows: byFormat.map((f) => ({
            format: f.label,
            due: f.due,
            present: f.present,
            absent: f.absent,
            excused: f.excused,
            rate: pctText(f.rate),
          })),
        },
        filters: programmeFilter(programme),
        definition: `${METRICS.attendanceRate.label}: ${METRICS.attendanceRate.definition}`,
        period: `Sessions that have started by the demo reporting date (${ref}).`,
        sampleSize: { label: 'Due bookings', value: overall.due },
        records: { label: 'View sessions and attendance', report: 'sessions', search: {} },
      }
    }

    case 'a_certification_ready': {
      const a = cohort(facts, { programme: 'A' })
      const meetsAll = (row: EnrolmentFact) =>
        (row.foundation?.score ?? 0) >= THRESHOLDS.foundationQuizPass &&
        row.completedUnits.has('C06') &&
        row.submission?.status === 'approved' &&
        (row.submission.reviewScore ?? 0) >= THRESHOLDS.assignmentPass &&
        (row.post?.score ?? 0) >= THRESHOLDS.finalAssessmentPass
      const certified = a.filter((row) => row.certificateIssued).length
      const ready = a.filter((row) => !row.certificateIssued && meetsAll(row))
      const awaiting = a.filter(
        (row) => !row.certificateIssued && !meetsAll(row) && m.isPendingMarking(row),
      )
      const earlier = a.length - certified - ready.length - awaiting.length
      return {
        title: 'Program A certification readiness',
        prose: `${n(ready.length)} Program A learners meet every certification condition and are ready for a certificate. ${n(awaiting.length)} more are one step away: their practical assignment is awaiting a trainer's review. ${n(certified)} already hold an issued certificate. Programs B and C do not certify.`,
        chart: {
          type: 'column',
          label: 'Program A enrolments',
          unit: 'count',
          data: [
            { label: 'Certified', value: certified },
            { label: 'Ready to issue', value: ready.length },
            { label: 'Awaiting review', value: awaiting.length },
            { label: 'Earlier stages', value: earlier },
          ],
        },
        table: {
          columns: [
            { key: 'learner', header: 'Learner' },
            { key: 'state', header: 'Readiness' },
            { key: 'next', header: 'Remaining step' },
          ],
          rows: [...ready, ...awaiting].slice(0, 12).map((row) => ({
            learner: `${row.learnerName} (${row.learnerCode})`,
            state: meetsAll(row) ? 'Ready to issue' : 'Awaiting review',
            next: meetsAll(row) ? 'Issue certificate' : 'Assignment review',
          })),
        },
        filters: [{ label: 'Programme', value: 'Program A' }],
        definition: `Ready = foundation quiz ${THRESHOLDS.foundationQuizPass}+, trainer-led session passed, practical assignment approved at ${THRESHOLDS.assignmentPass}+ and final assessment ${THRESHOLDS.finalAssessmentPass}+, with no issued certificate. ${METRICS.certificates.label}: ${METRICS.certificates.definition}`,
        period,
        sampleSize: { label: 'Program A enrolments', value: a.length },
        records: {
          label: 'View Program A awaiting review',
          report: 'program-a',
          search: { rowStatus: 'Awaiting review' },
        },
      }
    }

    case 'inactive_two_weeks': {
      const inactive = m.inactiveLearners(rows, facts.asOf)
      const byProgramme = m.PROGRAMMES.map((code) => ({
        label: PROGRAMME_LABELS[code],
        value: inactive.filter((i) => i.row.programme === code).length,
      })).filter((d) => d.value > 0)
      return {
        title: 'Learners inactive for two weeks',
        prose: `${n(inactive.length)} learners with an open enrolment have had no recorded activity for ${THRESHOLDS.inactiveLearnerDays} days or more. ${byProgramme.map((d) => `${d.label}: ${n(d.value)}`).join(', ')}. The longest gap is ${inactive[0]?.days ?? 0} days.`,
        chart: { type: 'column', label: 'Inactive learners', unit: 'count', data: byProgramme },
        table: {
          columns: [
            { key: 'learner', header: 'Learner' },
            { key: 'programme', header: 'Programme' },
            { key: 'stage', header: 'Current stage' },
            { key: 'days', header: 'Days inactive', numeric: true },
          ],
          rows: inactive.slice(0, 12).map(({ row, days }) => ({
            learner: `${row.learnerName} (${row.learnerCode})`,
            programme: PROGRAMME_LABELS[row.programme],
            stage: row.currentStage,
            days,
          })),
        },
        filters: programmeFilter(programme),
        definition: `${METRICS.inactiveLearners.label}: ${METRICS.inactiveLearners.definition}`,
        period: `Activity up to the demo reporting date (${ref}).`,
        sampleSize: { label: 'Inactive learners', value: inactive.length },
        records: {
          label: 'View inactive learners',
          report: 'learners',
          search: { view: 'inactive', ...(programme ? { programme } : {}) },
        },
      }
    }

    case 'best_by_score': {
      const scored = rows
        .filter((row) => row.post)
        .sort(
          (a, b) =>
            (b.post?.score ?? 0) - (a.post?.score ?? 0) ||
            a.learnerCode.localeCompare(b.learnerCode),
        )
      const top = scored.filter((row) => row.post?.score === scored[0]?.post?.score)
      return {
        title: 'Best assessment scores',
        prose: `${n(top.length)} learners share the top post-assessment score of ${scored[0]?.post?.score ?? 0}. The average post score across ${n(scored.length)} learners is ${m.improvement(scored).overall.post}.`,
        chart: {
          type: 'column',
          label: 'Learners',
          unit: 'count',
          data: [100, 80, 60, 40, 20, 0].map((score) => ({
            label: `Score ${score}`,
            value: scored.filter((row) => row.post?.score === score).length,
          })),
        },
        table: {
          columns: [
            { key: 'learner', header: 'Learner' },
            { key: 'programme', header: 'Programme' },
            { key: 'post', header: 'Post score', numeric: true },
          ],
          rows: scored.slice(0, 10).map((row) => ({
            learner: `${row.learnerName} (${row.learnerCode})`,
            programme: PROGRAMME_LABELS[row.programme],
            post: row.post?.score ?? null,
          })),
        },
        filters: programmeFilter(programme),
        definition: 'Latest submitted post-assessment score (percent) per enrolment.',
        period,
        sampleSize: { label: 'Learners with a post score', value: scored.length },
        records: {
          label: 'View assessment records',
          report: 'assessments',
          search: { sort: 'score', direction: 'desc' },
        },
      }
    }

    case 'best_by_completion': {
      const ranked = m
        .organisationCompletion(rows)
        .filter((o) => o.enrolments >= MIN_ORG_SAMPLE)
        .sort((a, b) => b.rate - a.rate || b.enrolments - a.enrolments)
        .slice(0, 5)
      return {
        title: 'Highest completion rate by organisation',
        prose: ranked[0]
          ? `${ranked[0].organisationName} leads with ${pctText(ranked[0].rate)} completion (${n(ranked[0].completed)} of ${n(ranked[0].enrolments)}). Organisations with fewer than ${MIN_ORG_SAMPLE} enrolments are not ranked.`
          : 'No organisation has enough enrolments to rank.',
        chart: {
          type: 'bar',
          label: 'Completion rate',
          unit: 'percent',
          data: ranked.map((o) => ({ label: o.organisationName, value: o.rate })),
        },
        table: {
          columns: [
            { key: 'organisation', header: 'Organisation' },
            { key: 'enrolments', header: 'Enrolments', numeric: true },
            { key: 'completed', header: 'Completed', numeric: true },
            { key: 'rate', header: 'Completion rate', numeric: true },
          ],
          rows: ranked.map((o) => ({
            organisation: o.organisationName,
            enrolments: o.enrolments,
            completed: o.completed,
            rate: pctText(o.rate),
          })),
        },
        filters: [
          ...programmeFilter(programme),
          { label: 'Minimum sample', value: `${MIN_ORG_SAMPLE} enrolments` },
        ],
        definition: `${METRICS.completionRate.label}: ${METRICS.completionRate.definition}`,
        period,
        sampleSize: {
          label: 'Enrolments in ranked organisations',
          value: ranked.reduce((s, o) => s + o.enrolments, 0),
        },
        records: {
          label: 'View completed enrolments',
          report: 'learners',
          search: { rowStatus: 'Completed' },
        },
      }
    }

    case 'best_by_improvement': {
      const pairs = rows
        .filter(m.hasPair)
        .map((row) => ({ row, gain: (row.post?.score ?? 0) - (row.pre?.score ?? 0) }))
        .sort((a, b) => b.gain - a.gain || a.row.learnerCode.localeCompare(b.row.learnerCode))
      const best = pairs[0]?.gain ?? 0
      const leaders = pairs.filter((p) => p.gain === best)
      return {
        title: 'Largest improvement',
        prose: `${n(leaders.length)} learners share the largest gain of ${signed(best)} percentage points between pre and post${leaders.some((l) => l.row.learnerCode === 'L0005') ? ', including Sara Mansour (60 to 100)' : ''}. The average gain across ${n(pairs.length)} paired learners is ${signed(m.improvement(pairs.map((p) => p.row)).overall.gain)} points.`,
        chart: {
          type: 'column',
          label: 'Learners',
          unit: 'count',
          data: [80, 60, 40, 20, 0].map((gain) => ({
            label: `${signed(gain)} pp`,
            value: pairs.filter((p) => p.gain === gain).length,
          })),
        },
        table: {
          columns: [
            { key: 'learner', header: 'Learner' },
            { key: 'programme', header: 'Programme' },
            { key: 'pre', header: 'Pre', numeric: true },
            { key: 'post', header: 'Post', numeric: true },
            { key: 'gain', header: 'Gain (pp)', numeric: true },
          ],
          rows: pairs.slice(0, 10).map((p) => ({
            learner: `${p.row.learnerName} (${p.row.learnerCode})`,
            programme: PROGRAMME_LABELS[p.row.programme],
            pre: p.row.pre?.score ?? null,
            post: p.row.post?.score ?? null,
            gain: signed(p.gain),
          })),
        },
        filters: programmeFilter(programme),
        definition: `${METRICS.improvement.label}: ${METRICS.improvement.definition}`,
        period,
        sampleSize: { label: 'Paired learners', value: pairs.length },
        records: {
          label: 'View assessment records',
          report: 'assessments',
          search: { sort: 'improvement', direction: 'desc' },
        },
      }
    }
  }
}
