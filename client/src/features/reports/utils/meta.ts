import type { ReportKey } from '@shared/schemas/admin-reports'

/** Static titles for headers and the hub, so a page has a title before its data arrives. */
export const REPORT_META: Record<
  ReportKey,
  {
    title: string
    description: string
    scope: 'cohort' | 'programme' | 'none'
    searchHint?: string
    programme?: 'A' | 'B' | 'C'
  }
> = {
  'program-a': {
    title: 'Program A users',
    description: 'Tourism Service Professional enrolments.',
    scope: 'cohort',
    programme: 'A',
  },
  'program-b': {
    title: 'Program B users',
    description: 'Visitor Service Essentials enrolments.',
    scope: 'cohort',
    programme: 'B',
  },
  'program-c': {
    title: 'Program C users',
    description: 'Destination Storytelling sample enrolments.',
    scope: 'cohort',
    programme: 'C',
  },
  learners: {
    title: 'All learners',
    description: 'Every enrolment across the three programmes.',
    scope: 'cohort',
  },
  trainers: {
    title: 'Trainers',
    description: 'Ten fictional trainers, sessions and marking workload.',
    scope: 'programme',
    searchHint: 'Trainer ID, name, expertise, programme',
  },
  sessions: {
    title: 'Sessions and attendance',
    description: 'All sample sessions, bookings and attendance.',
    scope: 'programme',
    searchHint: 'Session ID, title, trainer, venue',
  },
  assessments: {
    title: 'Assessments and improvement',
    description: 'Assessment attempts and paired improvement.',
    scope: 'cohort',
  },
  'assessment-results': {
    title: 'Assessment results',
    description:
      'Pre and post outcomes per learner: attempts, language, pass or fail and best score.',
    scope: 'cohort',
    searchHint: 'Learner ID, name, assessment, language',
  },
  assignments: {
    title: 'Assignments',
    description: 'Practical assignments and short responses.',
    scope: 'cohort',
  },
  certification: {
    title: 'Certification',
    description: 'Program A credentials with validity, expiry and renewal. B and C are excluded.',
    scope: 'cohort',
    searchHint: 'Certificate ID, learner ID, name',
  },
  notifications: {
    title: 'Notifications and exports',
    description: 'Notification delivery states and export events.',
    scope: 'none',
    searchHint: 'Event, session or report, actor, event ID',
  },
  approvals: {
    title: 'Approvals',
    description: 'Enrolment and external-certificate requests by status and reviewer.',
    scope: 'none',
    searchHint: 'Request ID, type, learner ID, name',
  },
  'external-review': {
    title: 'External certificate review',
    description: 'External certificates, claimed and recognised CPD, and review status.',
    scope: 'none',
    searchHint: 'Learner ID, name, certificate, issuer, reference',
  },
  waitlist: {
    title: 'Waitlist',
    description: 'Learners waiting for a seat or holding an offer on upcoming sessions.',
    scope: 'none',
    searchHint: 'Session, learner ID, name',
  },
  'account-status': {
    title: 'Locked accounts',
    description: 'Locked and disabled learner accounts with reason and who changed them.',
    scope: 'none',
    searchHint: 'Learner ID, name, reason',
  },
  cpd: {
    title: 'CPD progress',
    description: 'Earned, pending and remaining CPD per learner against the demo target.',
    scope: 'cohort',
    searchHint: 'Learner ID, name',
  },
  content: {
    title: 'Content by language and format',
    description: 'English and Arabic SCORM and xAPI packages with launches and completions.',
    scope: 'none',
    searchHint: 'Package ID, title, format, language',
  },
  'crm-sync': {
    title: 'CRM sync status',
    description: 'Simulated CRM events by direction, status, attempts and error.',
    scope: 'none',
    searchHint: 'Event ID, entity, direction, learner ID, error',
  },
  attention: {
    title: 'Learners requiring attention',
    description: 'Open enrolments with an issue to act on.',
    scope: 'cohort',
  },
}

/** The Reports children: the brief §12 reports first, then the 29 Oct additions. */
export const REPORT_ORDER: ReportKey[] = [
  'program-a',
  'program-b',
  'program-c',
  'learners',
  'trainers',
  'sessions',
  'assessments',
  'assessment-results',
  'assignments',
  'certification',
  'cpd',
  'approvals',
  'external-review',
  'waitlist',
  'account-status',
  'content',
  'crm-sync',
  'notifications',
]
