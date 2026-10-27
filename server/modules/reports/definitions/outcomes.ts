import type { EnrolmentFact } from '../../analytics/analytics.types'
import * as reportsService from '../reports.service'
import type { ReportDefinition, ReportRow } from '../reports.types'

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
  searchKeys: ['learnerCode', 'name', 'assessment'],
  async load({ cohort }) {
    const facts = byEnrolment(cohort)
    const attempts = await reportsService.attemptRows()
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
        score: attempt.score,
        improvement: isPost && pre !== null ? attempt.score - pre : null,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
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
  async load({ cohort, facts: all, query }) {
    const facts = byEnrolment(cohort)
    const subs = await reportsService.submissionRows()
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
          submittedAt: s.submittedAt.toISOString(),
          marker: s.marker ? `${s.marker} (${s.markerCode})` : 'Unassigned',
          status: SUBMISSION_STATUS_LABEL[s.status],
          feedback: s.feedback ?? null,
          waitingDays: pending
            ? Math.floor((all.asOf.getTime() - s.submittedAt.getTime()) / 86_400_000)
            : null,
        }
      })
  },
}

/** Brief §13 Certification: Program A only. B and C are excluded by construction and by filter. */
export const certificationReport: ReportDefinition = {
  key: 'certification',
  title: 'Certification',
  description: 'Program A certificates. Programs B and C do not issue certificates.',
  filterScope: 'cohort',
  columns: [
    { key: 'code', header: 'Certificate ID', type: 'code' },
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'name', header: 'A learner', type: 'text', field: 'displayName' },
    { key: 'issuedAt', header: 'Issue date', type: 'date' },
    { key: 'evidence', header: 'Eligibility evidence', type: 'text' },
    { key: 'status', header: 'State', type: 'status' },
    { key: 'revokeReason', header: 'Revocation reason', type: 'text', detailOnly: true },
  ],
  statusKey: 'status',
  statusOptions: [
    { value: 'Issued', label: 'Issued' },
    { value: 'Revoked', label: 'Revoked' },
  ],
  defaultSort: { key: 'code', direction: 'asc' },
  searchKeys: ['code', 'learnerCode', 'name'],
  async load({ cohort }) {
    const facts = byEnrolment(cohort)
    const certs = await reportsService.certificateRows()
    return certs
      .filter((c) => c.programme === 'A' && facts.has(c.enrolmentId))
      .map((c) => {
        const e = c.evidence as Record<string, number | string | undefined>
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
          id: c.id,
          learnerId: facts.get(c.enrolmentId)?.learnerId ?? null,
          code: c.code,
          learnerCode: c.learnerCode,
          name: c.learnerName,
          issuedAt: c.issuedAt.toISOString(),
          evidence: evidence || 'All Program A conditions passed',
          status: c.status === 'issued' ? 'Issued' : 'Revoked',
          revokeReason: c.revokeReason,
        }
      })
  },
}
