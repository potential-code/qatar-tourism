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
  assignments: {
    title: 'Assignments',
    description: 'Practical assignments and short responses.',
    scope: 'cohort',
  },
  certification: {
    title: 'Certification',
    description: 'Program A certificates. B and C are excluded.',
    scope: 'cohort',
    searchHint: 'Certificate ID, learner ID, name',
  },
  notifications: {
    title: 'Notifications and exports',
    description: 'Notification delivery states and export events.',
    scope: 'none',
    searchHint: 'Event, session or report, actor, event ID',
  },
  attention: {
    title: 'Learners requiring attention',
    description: 'Open enrolments with an issue to act on.',
    scope: 'cohort',
  },
}

/** The ten Reports children, in the brief §12 order. */
export const REPORT_ORDER: ReportKey[] = [
  'program-a',
  'program-b',
  'program-c',
  'learners',
  'trainers',
  'sessions',
  'assessments',
  'assignments',
  'certification',
  'notifications',
]
