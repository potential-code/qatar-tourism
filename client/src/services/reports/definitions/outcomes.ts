import type { EnrolmentFact } from '../../analytics/types'
import { credentialViews } from '../../credentials/lifecycle'
import * as reads from '../reads'
import type { ReportDefinition, ReportRow } from '../types'

const KIND_LABEL = { pre: 'Pre-assessment', post: 'Post-assessment', formative: 'Foundation quiz' }
const SUBMISSION_STATUS_LABEL = {
  submitted: 'Submitted',
  under_review: 'Under review',
  returned: 'Returned for revision',
  approved: 'Approved',
} as const

const byEnrolment = (cohort: readonly EnrolmentFact[]) =>
  new Map(cohort.map((fact) => [fact.enrolmentId, fact]))

const learnerCells = (fact: EnrolmentFact) => ({
  learnerId: fact.learnerId,
  learnerCode: fact.learnerCode,
  name: fact.learnerName,
  programme: fact.programme,
})

/** Brief §13 "Assessments and assignments" columns, for the pre, post and foundation attempts. */
export const assessmentsReport: ReportDefinition = {
  key: 'assessments',
  title: 'Assessments and improvement',
  description: 'Every submitted assessment attempt, with the paired improvement on post attempts.',
  filterScope: 'cohort',
  columns: [
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'name', header: 'Learner', type: 'text', field: 'displayName' },
    { key: 'programme', header: 'Programme', type: 'programme' },
    { key: 'assessment', header: 'Assessment', type: 'text' },
    { key: 'version', header: 'Version', type: 'code' },
    { key: 'attempt', header: 'Attempt', type: 'number' },
    { key: 'language', header: 'Language', type: 'text' },
    { key: 'score', header: 'Score', type: 'score' },
    { key: 'improvement', header: 'Improvement (pp)', type: 'number' },
    { key: 'submittedAt', header: 'Submission date', type: 'date' },
    { key: 'marker', header: 'Marker', type: 'text' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'feedback', header: 'Feedback', type: 'text', detailOnly: true },
  ],
  statusKey: 'status',
  statusOptions: [
    { value: 'Passed', label: 'Passed' },
    { value: 'Below pass mark', label: 'Below pass mark' },
    { value: 'Baseline recorded', label: 'Baseline recorded' },
  ],
  defaultSort: { key: 'submittedAt', direction: 'desc' },
  searchKeys: ['learnerCode', 'name', 'assessment', 'language'],
  load({ cohort }) {
    const facts = byEnrolment(cohort)
    const attempts = reads.attemptRows()
    const rows: ReportRow[] = []
    for (const attempt of attempts) {
      const fact = facts.get(attempt.enrolmentId)
      if (!fact || attempt.status !== 'submitted' || attempt.score === null) continue
      const pass = attempt.passPercent
      const isPost = attempt.kind === 'post'
      const pre = fact.pre?.score ?? null
      rows.push({
        id: attempt.id,
        ...learnerCells(fact),
        assessment: KIND_LABEL[attempt.kind],
        version: attempt.version,
        attempt: attempt.attemptNo,
        language: attempt.language === 'ar' ? 'Arabic' : 'English',
        score: attempt.score,
        improvement: isPost && pre !== null ? attempt.score - pre : null,
        submittedAt: attempt.submittedAt,
        marker: 'Automatic scoring',
        status:
          pass === null
            ? 'Baseline recorded'
            : attempt.score >= pass
              ? 'Passed'
              : 'Below pass mark',
        feedback:
          isPost && pre !== null
            ? `Pre ${pre}, post ${attempt.score}: ${attempt.score - pre >= 0 ? '+' : ''}${attempt.score - pre} percentage points.`
            : 'Scored automatically against the five competencies.',
      })
    }
    return rows
  },
  summarise(rows) {
    const post = rows.filter((row) => row.improvement !== null)
    const gain = post.length
      ? post.reduce((sum, row) => sum + Number(row.improvement), 0) / post.length
      : 0
    return [
      { label: 'Attempts', value: rows.length.toLocaleString('en-GB') },
      { label: 'Paired pre/post', value: String(post.length) },
      { label: 'Average gain', value: `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} pp` },
    ]
  },
}

/** Brief §13 Assignments: A practical assignment and B short response, every version. */
export const assignmentsReport: ReportDefinition = {
  key: 'assignments',
  title: 'Assignments',
  description: 'Every submitted version of the A practical assignment and the B short response.',
  filterScope: 'cohort',
  columns: [
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'name', header: 'Learner', type: 'text', field: 'displayName' },
    { key: 'programme', header: 'Programme', type: 'programme' },
    { key: 'assignment', header: 'Assignment', type: 'text' },
    { key: 'version', header: 'Version', type: 'number' },
    { key: 'score', header: 'Score', type: 'score' },
    { key: 'submittedAt', header: 'Submission date', type: 'date' },
    { key: 'marker', header: 'Marker', type: 'text' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'feedback', header: 'Feedback', type: 'text', detailOnly: true },
    { key: 'waitingDays', header: 'Days waiting', type: 'number' },
  ],
  statusKey: 'status',
  statusOptions: Object.values(SUBMISSION_STATUS_LABEL).map((label) => ({ value: label, label })),
  defaultSort: { key: 'submittedAt', direction: 'desc' },
  searchKeys: ['learnerCode', 'name', 'assignment', 'marker'],
  load({ cohort, facts: all, query }) {
    const facts = byEnrolment(cohort)
    const subs = reads.submissionRows()
    const latest = new Map<string, number>()
    for (const s of subs)
      latest.set(s.enrolmentId, Math.max(latest.get(s.enrolmentId) ?? 0, s.version))
    return subs
      .filter((s) => facts.has(s.enrolmentId))
      .filter(
        (s) =>
          query.view !== 'pending' ||
          (latest.get(s.enrolmentId) === s.version &&
            (s.status === 'submitted' || s.status === 'under_review')),
      )
      .map((s) => {
        const fact = facts.get(s.enrolmentId) as EnrolmentFact
        const pending = s.status === 'submitted' || s.status === 'under_review'
        return {
          id: s.id,
          ...learnerCells(fact),
          assignment: s.assignment,
          version: s.version,
          score: s.score ?? null,
          submittedAt: s.submittedAt,
          marker: s.marker ? `${s.marker} (${s.markerCode})` : 'Unassigned',
          status: SUBMISSION_STATUS_LABEL[s.status],
          feedback: s.feedback ?? null,
          waitingDays: pending
            ? Math.floor((all.asOf.getTime() - Date.parse(s.submittedAt)) / 86_400_000)
            : null,
        }
      })
  },
}

const LIFECYCLE_LABEL = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  revoked: 'Revoked',
  superseded: 'Superseded',
} as const

const RENEWAL_LABEL = {
  none: 'Not due',
  renewal_due: 'Renewal due',
  renewal_in_progress: 'Renewal in progress',
  retraining: 'Retraining required',
  renewed: 'Renewed',
  revoked: 'Revoked, not renewable',
} as const

/**
 * Brief §13 Certification, extended for SPEC §7 with validity and renewal: Program A credentials
 * only (B and C are excluded by construction and by filter), one row per credential including
 * prior cycles. The state is derived from the expiry and the demo clock.
 */
export const certificationReport: ReportDefinition = {
  key: 'certification',
  title: 'Certification',
  description:
    'Program A credentials with validity, expiry and renewal. Programs B and C do not issue certificates. State follows the demo clock; validity and CPD are demo settings, subject to Qatar Tourism confirmation.',
  filterScope: 'cohort',
  columns: [
    { key: 'code', header: 'Certificate ID', type: 'code' },
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'name', header: 'A learner', type: 'text', field: 'displayName' },
    { key: 'issuedAt', header: 'Issue date', type: 'date' },
    { key: 'expiresAt', header: 'Expiry date', type: 'date' },
    { key: 'daysToExpiry', header: 'Days to expiry', type: 'number' },
    { key: 'status', header: 'Validity', type: 'status' },
    { key: 'renewal', header: 'Renewal', type: 'text' },
    { key: 'cpdHours', header: 'CPD hours', type: 'number' },
    { key: 'evidence', header: 'Eligibility evidence', type: 'text', detailOnly: true },
    { key: 'ruleVersion', header: 'Rule version', type: 'code', detailOnly: true },
    { key: 'supersedes', header: 'Renews', type: 'code', detailOnly: true },
    { key: 'supersededBy', header: 'Renewed by', type: 'code', detailOnly: true },
    { key: 'revokeReason', header: 'Revocation reason', type: 'text', detailOnly: true },
  ],
  statusKey: 'status',
  statusOptions: Object.values(LIFECYCLE_LABEL).map((label) => ({ value: label, label })),
  defaultSort: { key: 'code', direction: 'asc' },
  searchKeys: ['code', 'learnerCode', 'name', 'renewal'],
  load({ cohort }) {
    const facts = byEnrolment(cohort)
    const enrolmentOf = new Map(reads.certificateRows().map((c) => [c.id, c]))
    return credentialViews()
      .filter((view) => {
        const row = enrolmentOf.get(view.id)
        return row && row.programme === 'A' && facts.has(row.enrolmentId)
      })
      .map((view) => {
        const row = enrolmentOf.get(view.id)
        const e = (row?.evidence ?? {}) as Record<string, number | string | undefined>
        const evidence = [
          e.foundationQuizAtLeast !== undefined
            ? `Foundation quiz ${e.foundationQuizAtLeast}+`
            : null,
          e.sessionScoreAtLeast !== undefined ? `session ${e.sessionScoreAtLeast}+` : null,
          e.assignmentScoreAtLeast !== undefined ? `assignment ${e.assignmentScoreAtLeast}+` : null,
          e.finalAssessmentScore !== undefined
            ? `final assessment ${e.finalAssessmentScore}`
            : null,
        ]
          .filter(Boolean)
          .join(', ')
        return {
          id: view.id,
          learnerId: view.learnerId,
          code: view.code,
          learnerCode: view.learnerCode,
          name: view.learnerName,
          issuedAt: view.issuedAt,
          expiresAt: view.expiresAt,
          daysToExpiry:
            view.lifecycle === 'active' ||
            view.lifecycle === 'expiring_soon' ||
            view.lifecycle === 'expired'
              ? view.daysToExpiry
              : null,
          status: LIFECYCLE_LABEL[view.lifecycle],
          renewal: RENEWAL_LABEL[view.nextAction],
          cpdHours: view.cpdHours,
          evidence: evidence || 'All Program A conditions passed',
          ruleVersion: view.ruleVersion,
          supersedes: view.supersedesCode,
          supersededBy: view.supersededByCode,
          revokeReason: view.revokeReason,
        }
      })
  },
  summarise(rows) {
    const count = (label: string) => rows.filter((r) => r.status === label).length
    return [
      { label: 'Credentials', value: rows.length.toLocaleString('en-GB') },
      { label: 'Expiring soon', value: String(count('Expiring soon')) },
      { label: 'Expired', value: String(count('Expired')) },
      {
        label: 'Renewal due or started',
        value: String(
          rows.filter(
            (r) =>
              r.renewal === 'Renewal due' ||
              r.renewal === 'Renewal in progress' ||
              r.renewal === 'Retraining required',
          ).length,
        ),
      },
    ]
  },
}
