import type { ProgrammeCode } from '@shared/constants'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { reportExportQuery } from '@shared/schemas/admin-reports'
import { cohort } from '../analytics/filters'
import { METRICS } from '../analytics/registry'
import type { Facts } from '../analytics/types'
import { db } from '../api'
import { credentialViews } from '../credentials/lifecycle'
import { toEventView } from '../crm/views'
import { assessmentResultsReport } from '../reports/definitions/assessment-results'
import { settleOffers } from '../rsvps/offers'
import { waitlistEntries } from '../rsvps-waitlist.service'
import type { Built } from './answers'

/**
 * Governed answers for the four 29 Oct prompts (SPEC §9). Each reads the same records and
 * helpers as the dashboard and the matching report, states its active filters, and says so plainly
 * when there is nothing to report instead of inventing a figure.
 */

export const EXPIRY_WINDOW_DAYS = 30

const n = (value: number) => value.toLocaleString('en-GB')
const period = (ref: string) =>
  `Records up to the demo date, ${ref} (Qatar time), including the demo clock.`
const programmeFilter = (programme: ProgrammeCode | null) => [
  {
    label: 'Programme',
    value: programme ? PROGRAMME_LABELS[programme] : 'Program A (credentials and sessions)',
  },
]

export function certificatesExpiring(programme: ProgrammeCode | null, ref: string): Built {
  const rows = credentialViews()
    .filter(
      (c) =>
        (programme === null || programme === c.programmeCode) &&
        (c.lifecycle === 'active' || c.lifecycle === 'expiring_soon') &&
        c.daysToExpiry !== null &&
        c.daysToExpiry >= 0 &&
        c.daysToExpiry <= EXPIRY_WINDOW_DAYS,
    )
    .sort((a, b) => (a.daysToExpiry ?? 0) - (b.daysToExpiry ?? 0) || a.code.localeCompare(b.code))
  const buckets = [
    { label: '0 to 7 days', from: 0, to: 7 },
    { label: '8 to 14 days', from: 8, to: 14 },
    { label: '15 to 21 days', from: 15, to: 21 },
    { label: '22 to 30 days', from: 22, to: 30 },
  ].map((b) => ({
    label: b.label,
    value: rows.filter((r) => (r.daysToExpiry ?? -1) >= b.from && (r.daysToExpiry ?? -1) <= b.to)
      .length,
  }))
  return {
    title: 'Certificates expiring in the next 30 days',
    prose:
      rows.length === 0
        ? `No learner has a current certificate expiring within the next ${EXPIRY_WINDOW_DAYS} days of the demo date. Nothing is shown rather than an estimate.`
        : `${n(rows.length)} learner${rows.length === 1 ? ' has' : 's have'} a current certificate expiring within ${EXPIRY_WINDOW_DAYS} days. The soonest is ${rows[0]?.code} for ${rows[0]?.learnerName} (${rows[0]?.learnerDisplayId}) in ${rows[0]?.daysToExpiry} days. Open each credential in Reports, Certification to see renewal status.`,
    chart:
      rows.length === 0
        ? null
        : { type: 'column', label: 'Credentials', unit: 'count', data: buckets },
    table: {
      columns: [
        { key: 'learner', header: 'Learner' },
        { key: 'credential', header: 'Credential' },
        { key: 'expires', header: 'Expires' },
        { key: 'days', header: 'Days left', numeric: true },
        { key: 'renewal', header: 'Renewal' },
      ],
      rows: rows.map((c) => ({
        learner: `${c.learnerName} (${c.learnerDisplayId})`,
        credential: c.code,
        expires: c.expiresAt?.slice(0, 10) ?? null,
        days: c.daysToExpiry,
        renewal:
          c.nextAction === 'renewal_in_progress'
            ? 'Renewal in progress'
            : c.nextAction === 'renewal_due'
              ? 'Renewal due'
              : 'Not due',
      })),
    },
    filters: [
      ...programmeFilter(programme),
      { label: 'Window', value: `Next ${EXPIRY_WINDOW_DAYS} days` },
      { label: 'States', value: 'Active or expiring soon (revoked and superseded excluded)' },
    ],
    definition: `${METRICS.certificatesExpiring.label}: ${METRICS.certificatesExpiring.definition}`,
    period: period(ref),
    sampleSize: { label: 'Credentials expiring', value: rows.length },
    records: {
      label: 'View Certification report',
      report: 'certification',
      search: { rowStatus: 'Expiring soon', sort: 'daysToExpiry', direction: 'asc' },
    },
  }
}

export function programmeAWaitlist(programme: ProgrammeCode | null, ref: string): Built {
  settleOffers()
  const letter = programme ?? 'A'
  const programmeId = db.programmes.find((p) => p.code === letter)?.id
  const sessionIds = new Set(
    db.sessions.filter((s) => s.programmeId === programmeId).map((s) => s.id),
  )
  const entries = waitlistEntries().filter((e) => sessionIds.has(e.sessionId))
  const learners = new Set(entries.map((e) => e.learnerId)).size
  const bySession = [...new Set(entries.map((e) => e.sessionCode))].map((code) => ({
    label: code,
    value: entries.filter((e) => e.sessionCode === code).length,
  }))
  return {
    title: `Learners waiting for Program ${letter} sessions`,
    prose:
      entries.length === 0
        ? `No learner is waiting for a Program ${letter} session on the demo date.`
        : `${n(learners)} learner${learners === 1 ? ' is' : 's are'} waiting for Program ${letter} sessions across ${n(bySession.length)} session${bySession.length === 1 ? '' : 's'} (${n(entries.length)} waitlist entr${entries.length === 1 ? 'y' : 'ies'}, ${n(entries.filter((e) => e.status === 'offered').length)} with a seat offer pending). A waitlisted learner is not recorded as attending.`,
    chart:
      entries.length === 0
        ? null
        : { type: 'column', label: 'Waitlist entries', unit: 'count', data: bySession },
    table: {
      columns: [
        { key: 'session', header: 'Session' },
        { key: 'learner', header: 'Learner' },
        { key: 'position', header: 'Position', numeric: true },
        { key: 'status', header: 'Status' },
      ],
      rows: entries.map((e) => ({
        session: `${e.sessionCode} ${e.sessionTitle}`,
        learner: `${e.name} (${e.learnerDisplayId})`,
        position: e.position,
        status: e.status === 'offered' ? 'Offer pending' : 'Waitlisted',
      })),
    },
    filters: [
      { label: 'Programme', value: PROGRAMME_LABELS[letter] },
      { label: 'Sessions', value: 'Upcoming, published or full' },
      { label: 'Statuses', value: 'Waitlisted or offer pending' },
    ],
    definition: `${METRICS.waitlistedLearners.label}: ${METRICS.waitlistedLearners.definition}`,
    period: period(ref),
    sampleSize: { label: 'Waitlisted learners', value: learners },
    records: { label: 'View Waitlist report', report: 'waitlist', search: {} },
  }
}

const LANGUAGES = [
  { key: 'en', label: 'English', cell: 'English' },
  { key: 'ar', label: 'Arabic', cell: 'Arabic' },
] as const

export function assessmentPassRates(facts: Facts, ref: string): Built {
  const query = reportExportQuery.parse({})
  const rows = assessmentResultsReport
    .load({ facts, cohort: cohort(facts, {}), query })
    .filter((r) => r.assessment === 'Post-assessment')
  const decided = rows.filter(
    (r) =>
      r.result === 'Passed' || r.result === 'Not passed' || r.result === 'Attempt limit reached',
  )
  const groups = (['A', 'B'] as const).flatMap((programme) =>
    LANGUAGES.map((language) => {
      const set = decided.filter((r) => r.programme === programme && r.language === language.cell)
      const passed = set.filter((r) => r.result === 'Passed').length
      return {
        programme,
        language,
        decided: set.length,
        passed,
        rate: set.length ? Math.round((passed / set.length) * 1000) / 10 : null,
      }
    }),
  )
  const withData = groups.filter((g) => g.decided > 0)
  const chartData = (['A', 'B'] as const)
    .map((programme) => {
      const point: { label: string } & Record<string, number | string> = {
        label: PROGRAMME_LABELS[programme],
      }
      for (const g of withData.filter((x) => x.programme === programme)) {
        point[g.language.key] = g.rate ?? 0
      }
      return point
    })
    .filter((point) => Object.keys(point).length > 1)
  const overallPassed = decided.filter((r) => r.result === 'Passed').length
  return {
    title: 'Assessment pass rates by programme and language',
    prose:
      decided.length === 0
        ? 'No post-assessment has a decided result yet, so there is no pass rate to report.'
        : `${n(overallPassed)} of ${n(decided.length)} decided post-assessments passed (${(Math.round((overallPassed / decided.length) * 1000) / 10).toLocaleString('en-GB')}%). ${withData
            .map(
              (g) =>
                `${PROGRAMME_LABELS[g.programme]} in ${g.language.label}: ${g.rate}% of ${n(g.decided)}`,
            )
            .join('; ')}. A combination with no attempts is shown as no data, not as zero.`,
    chart:
      decided.length === 0
        ? null
        : {
            type: 'grouped',
            unit: 'percent',
            series: LANGUAGES.filter((l) => withData.some((g) => g.language.key === l.key)).map(
              (l) => ({ key: l.key, label: l.label }),
            ),
            data: chartData,
          },
    table: {
      columns: [
        { key: 'programme', header: 'Programme' },
        { key: 'language', header: 'Language' },
        { key: 'decided', header: 'Decided', numeric: true },
        { key: 'passed', header: 'Passed', numeric: true },
        { key: 'rate', header: 'Pass rate' },
      ],
      rows: groups.map((g) => ({
        programme: PROGRAMME_LABELS[g.programme],
        language: g.language.label,
        decided: g.decided,
        passed: g.passed,
        rate: g.rate === null ? 'No attempts' : `${g.rate}%`,
      })),
    },
    filters: [
      { label: 'Assessment', value: 'Post-assessment (pre-assessment has no pass gate)' },
      { label: 'Programmes', value: 'Program A and Program B' },
      { label: 'Language', value: 'Language of the attempt (default English)' },
    ],
    definition: `${METRICS.assessmentPassRate.label}: ${METRICS.assessmentPassRate.definition}`,
    period: period(ref),
    sampleSize: { label: 'Decided post-assessments', value: decided.length },
    records: {
      label: 'View Assessment results',
      report: 'assessment-results',
      search: { search: 'Post-assessment' },
    },
  }
}

export function crmFailedEvents(ref: string): Built {
  const codes = new Set<string>()
  const events = db.crmEvents
    .filter((e) => e.status === 'failed' || e.status === 'conflict')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.eventId.localeCompare(a.eventId))
  const failed = events.filter((e) => e.status === 'failed').length
  const conflict = events.length - failed
  return {
    title: 'CRM events that failed',
    prose:
      events.length === 0
        ? 'No simulated CRM event has failed or needs a mapping review.'
        : `${n(events.length)} simulated CRM event${events.length === 1 ? ' needs' : 's need'} attention: ${n(failed)} failed and ${n(conflict)} held as a conflict. ${events[0]?.eventId}: ${events[0]?.error ?? 'no error recorded'} Use Retry or Resolve mapping in Integrations and Security. Retrying never creates a second learner, enrolment or certificate.`,
    chart:
      events.length === 0
        ? null
        : {
            type: 'column',
            label: 'Events',
            unit: 'count',
            data: [
              { label: 'Failed', value: failed },
              { label: 'Conflict', value: conflict },
            ],
          },
    table: {
      columns: [
        { key: 'event', header: 'Event' },
        { key: 'entity', header: 'Entity' },
        { key: 'direction', header: 'Direction' },
        { key: 'status', header: 'Status' },
        { key: 'attempts', header: 'Attempts', numeric: true },
        { key: 'error', header: 'Error' },
      ],
      rows: events.map((e) => {
        const view = toEventView(e, codes)
        return {
          event: e.eventId,
          entity: e.type.charAt(0).toUpperCase() + e.type.slice(1),
          direction: view.source === 'CRM' ? 'CRM to LMS' : 'LMS to CRM',
          status: e.status === 'failed' ? 'Failed' : 'Conflict',
          attempts: e.attempts,
          error: e.error,
        }
      }),
    },
    filters: [
      { label: 'Statuses', value: 'Failed or conflict' },
      { label: 'Source', value: 'Simulated CRM (no network call)' },
    ],
    definition: `${METRICS.crmFailedEvents.label}: ${METRICS.crmFailedEvents.definition}`,
    period: period(ref),
    sampleSize: { label: 'Events needing attention', value: events.length },
    records: { label: 'View CRM sync status', report: 'crm-sync', search: { rowStatus: 'Failed' } },
  }
}
