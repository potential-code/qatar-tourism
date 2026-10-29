import { THRESHOLDS } from '@shared/constants'

/**
 * The metric registry: one governed definition per metric (brief §12 "Use one consistent
 * reporting definition per widget"). The UI shows `definition` in each widget's info popover and
 * the Demo analytics assistant quotes it in every answer, so the wording lives here only.
 */
export type MetricKey =
  | 'uniqueLearners'
  | 'activeLearners'
  | 'enrolments'
  | 'completions'
  | 'completionRate'
  | 'pendingAssessments'
  | 'upcomingSessions'
  | 'certificates'
  | 'attendanceRate'
  | 'improvement'
  | 'inactiveLearners'
  | 'markingBacklog'
  | 'sessionsNearingCapacity'

export type MetricDefinition = {
  key: MetricKey
  label: string
  definition: string
  unit: 'count' | 'percent' | 'points'
  /** Which filters the metric responds to. */
  scope: 'cohort' | 'programme'
  /** The report a KPI card opens (brief §12: "Each card opens its filtered report"). */
  report: string
}

export const METRICS: Record<MetricKey, MetricDefinition> = {
  uniqueLearners: {
    key: 'uniqueLearners',
    label: 'Unique learners',
    definition: 'Distinct learner IDs in the selected cohort.',
    unit: 'count',
    scope: 'cohort',
    report: 'learners',
  },
  activeLearners: {
    key: 'activeLearners',
    label: 'Active learners',
    definition: `Learners with at least one recorded learning activity in the last ${THRESHOLDS.activeLearnerDays} days as of the demo reporting date.`,
    unit: 'count',
    scope: 'cohort',
    report: 'learners',
  },
  enrolments: {
    key: 'enrolments',
    label: 'Enrolments',
    definition: 'Programme registrations, allowing more than one per learner.',
    unit: 'count',
    scope: 'cohort',
    report: 'learners',
  },
  completions: {
    key: 'completions',
    label: 'Completions',
    definition: 'Enrolments with status Completed under their programme rules.',
    unit: 'count',
    scope: 'cohort',
    report: 'learners',
  },
  completionRate: {
    key: 'completionRate',
    label: 'Completion rate',
    definition: 'Completed enrolments divided by eligible enrolments in the same filtered cohort.',
    unit: 'percent',
    scope: 'cohort',
    report: 'learners',
  },
  pendingAssessments: {
    key: 'pendingAssessments',
    label: 'Pending assessments',
    definition:
      'Latest assignment or short-response submissions that are submitted or under review and awaiting a trainer mark.',
    unit: 'count',
    scope: 'cohort',
    report: 'assignments',
  },
  upcomingSessions: {
    key: 'upcomingSessions',
    label: 'Upcoming sessions',
    definition:
      'Published or full sessions starting after the demo reporting date. Responds to the programme filter only.',
    unit: 'count',
    scope: 'programme',
    report: 'sessions',
  },
  certificates: {
    key: 'certificates',
    label: 'A certificates issued',
    definition: 'Issued, non-revoked Program A certificates. Programs B and C do not certify.',
    unit: 'count',
    scope: 'cohort',
    report: 'certification',
  },
  attendanceRate: {
    key: 'attendanceRate',
    label: 'Attendance rate',
    definition:
      'Attended or late records divided by due, non-cancelled session bookings for learners in the cohort.',
    unit: 'percent',
    scope: 'cohort',
    report: 'sessions',
  },
  improvement: {
    key: 'improvement',
    label: 'Learning improvement',
    definition:
      'Paired pre and post assessment scores for the same enrolment (latest submitted attempt of each). Gain is post minus pre in percentage points.',
    unit: 'points',
    scope: 'cohort',
    report: 'assessments',
  },
  inactiveLearners: {
    key: 'inactiveLearners',
    label: 'Inactive 14 days',
    definition: `Learners with an open enrolment whose last recorded activity is ${THRESHOLDS.inactiveLearnerDays} or more days before the demo reporting date. Learners who have not started are excluded.`,
    unit: 'count',
    scope: 'cohort',
    report: 'learners',
  },
  markingBacklog: {
    key: 'markingBacklog',
    label: 'Trainer marking backlog',
    definition: `Submissions awaiting each marking trainer plus draft session scores. Overdue after ${THRESHOLDS.markingOverdueDays} days (demo default).`,
    unit: 'count',
    scope: 'cohort',
    report: 'trainers',
  },
  sessionsNearingCapacity: {
    key: 'sessionsNearingCapacity',
    label: 'Sessions nearing capacity',
    definition: 'Upcoming sessions with confirmed bookings at 80% of capacity or more.',
    unit: 'count',
    scope: 'programme',
    report: 'sessions',
  },
}
