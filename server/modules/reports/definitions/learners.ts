import type { ProgrammeCode } from '@shared/constants'
import {
  ENROLMENT_STATUS_LABELS,
  labelOf,
  ORGANISATION_TYPE_LABELS,
  PROGRAMME_LABELS,
  SENIORITY_LABELS,
} from '@shared/schemas/admin-labels'
import type { ReportKey } from '@shared/schemas/admin-reports'
import {
  ATTENTION_LABELS,
  attentionList,
  daysSince,
  isActive,
  isPendingMarking,
} from '../../analytics/analytics.metrics'
import type { EnrolmentFact } from '../../analytics/analytics.types'
import * as reportsService from '../reports.service'
import type { ReportColumn, ReportDefinition, ReportRow } from '../reports.types'

/** Brief §13 "Programme users and All learners" columns, plus a controlled contact column. */
const LEARNER_COLUMNS: readonly ReportColumn[] = [
  { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
  { key: 'name', header: 'Name', type: 'text', field: 'displayName' },
  { key: 'email', header: 'Email', type: 'text', field: 'email' },
  { key: 'programme', header: 'Programme', type: 'programme' },
  { key: 'organisation', header: 'Organisation', type: 'text', field: 'organisationName' },
  {
    key: 'organisationType',
    header: 'Organisation type',
    type: 'text',
    field: 'organisationType',
    detailOnly: true,
  },
  { key: 'jobTitle', header: 'Job title', type: 'text', field: 'jobTitle' },
  { key: 'seniority', header: 'Seniority', type: 'text', field: 'seniority' },
  { key: 'path', header: 'Path', type: 'text' },
  { key: 'enrolledAt', header: 'Enrolment date', type: 'date' },
  { key: 'status', header: 'Status', type: 'status' },
  { key: 'stage', header: 'Current stage', type: 'text', detailOnly: true },
  { key: 'progress', header: 'Progress', type: 'percent' },
  { key: 'pre', header: 'Pre score', type: 'score' },
  { key: 'post', header: 'Post score', type: 'score' },
  { key: 'improvement', header: 'Improvement (pp)', type: 'number' },
  { key: 'lastActivityAt', header: 'Last activity', type: 'date' },
]

export function learnerRow(fact: EnrolmentFact, emails: Map<string, string>): ReportRow {
  const pre = fact.pre?.score ?? null
  const post = fact.post?.score ?? null
  return {
    id: fact.enrolmentId,
    learnerId: fact.learnerId,
    learnerCode: fact.learnerCode,
    name: fact.learnerName,
    email: emails.get(fact.learnerId) ?? null,
    programme: fact.programme,
    organisation: fact.organisationName,
    organisationType: labelOf(ORGANISATION_TYPE_LABELS, fact.organisationType),
    jobTitle: fact.jobTitle,
    seniority: labelOf(SENIORITY_LABELS, fact.seniority),
    path: fact.pathName
      ? `${fact.pathName}${fact.pathVersion ? ` (v${fact.pathVersion})` : ''}`
      : null,
    enrolledAt: fact.enrolledAt.toISOString(),
    status: ENROLMENT_STATUS_LABELS[fact.status],
    stage: fact.currentStage,
    progress: fact.progress,
    pre,
    post,
    improvement: pre !== null && post !== null ? post - pre : null,
    lastActivityAt: fact.lastActivityAt?.toISOString() ?? null,
  }
}

const STATUS_OPTIONS = Object.entries(ENROLMENT_STATUS_LABELS).map(([, label]) => ({
  value: label,
  label,
}))

function learnerReport(
  key: ReportKey,
  title: string,
  programme: ProgrammeCode | null,
): ReportDefinition {
  return {
    key,
    title,
    description: programme
      ? `One row per ${PROGRAMME_LABELS[programme]} enrolment.`
      : 'One row per enrolment. A learner enrolled in two programmes appears once per programme.',
    filterScope: 'cohort',
    columns: LEARNER_COLUMNS,
    statusKey: 'status',
    statusOptions: STATUS_OPTIONS,
    defaultSort: { key: 'learnerCode', direction: 'asc' },
    searchKeys: ['learnerCode', 'name', 'organisation', 'jobTitle', 'path'],
    async load({ cohort, facts, query }) {
      const emails = await reportsService.learnerEmails()
      return cohort
        .filter((fact) => !programme || fact.programme === programme)
        .filter((fact) => {
          if (query.view === 'active') return isActive(fact, facts.asOf)
          if (query.view === 'inactive')
            return (
              fact.status !== 'completed' &&
              (daysSince(fact.lastActivityAt, facts.asOf) ?? -1) >= 14
            )
          if (query.view === 'pending') return isPendingMarking(fact)
          return true
        })
        .map((fact) => learnerRow(fact, emails))
    },
    summarise(rows) {
      return [
        { label: 'Enrolments', value: rows.length.toLocaleString('en-GB') },
        {
          label: 'Unique learners',
          value: new Set(rows.map((row) => row.learnerId)).size.toLocaleString('en-GB'),
        },
      ]
    },
  }
}

export const programmeAReport = learnerReport('program-a', 'Program A users', 'A')
export const programmeBReport = learnerReport('program-b', 'Program B users', 'B')
export const programmeCReport = learnerReport('program-c', 'Program C users', 'C')
export const allLearnersReport = learnerReport('learners', 'All learners', null)

/** Dashboard table: learners requiring attention, with the reasons (brief §12). */
export const attentionReport: ReportDefinition = {
  key: 'attention',
  title: 'Learners requiring attention',
  description:
    'Open enrolments with an inactivity, prerequisite, attendance, revision or marking issue.',
  filterScope: 'cohort',
  columns: [
    { key: 'learnerCode', header: 'Learner ID', type: 'code', field: 'learnerCode' },
    { key: 'name', header: 'Name', type: 'text', field: 'displayName' },
    { key: 'programme', header: 'Programme', type: 'programme' },
    { key: 'organisation', header: 'Organisation', type: 'text', field: 'organisationName' },
    { key: 'reason', header: 'Needs attention', type: 'text' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'progress', header: 'Progress', type: 'percent' },
    { key: 'inactiveDays', header: 'Days inactive', type: 'number' },
  ],
  statusKey: 'primaryReason',
  statusOptions: Object.values(ATTENTION_LABELS).map((label) => ({ value: label, label })),
  defaultSort: { key: 'inactiveDays', direction: 'desc' },
  searchKeys: ['learnerCode', 'name', 'organisation', 'reason'],
  async load({ facts, cohort }) {
    return attentionList(facts, cohort).map(({ row, reasons, inactiveDays }) => ({
      id: row.enrolmentId,
      learnerId: row.learnerId,
      learnerCode: row.learnerCode,
      name: row.learnerName,
      programme: row.programme,
      organisation: row.organisationName,
      reason: reasons.map((r) => ATTENTION_LABELS[r]).join('; '),
      primaryReason: ATTENTION_LABELS[reasons[0] ?? 'inactive'],
      status: ENROLMENT_STATUS_LABELS[row.status],
      progress: row.progress,
      inactiveDays,
    }))
  },
  summarise(rows) {
    return [
      { label: 'Enrolments needing attention', value: rows.length.toLocaleString('en-GB') },
      {
        label: 'Learners',
        value: new Set(rows.map((row) => row.learnerId)).size.toLocaleString('en-GB'),
      },
    ]
  },
}
