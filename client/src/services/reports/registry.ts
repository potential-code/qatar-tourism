import type { ReportKey } from '@shared/schemas/admin-reports'
import { assessmentResultsReport } from './definitions/assessment-results'
import {
  allLearnersReport,
  attentionReport,
  programmeAReport,
  programmeBReport,
  programmeCReport,
} from './definitions/learners'
import { notificationsReport } from './definitions/notifications'
import { sessionsReport, trainersReport } from './definitions/operations'
import { assessmentsReport, assignmentsReport, certificationReport } from './definitions/outcomes'
import type { ReportDefinition } from './types'

/** Every report the admin workspace offers (brief §12 Reports children, §13 columns). */
export const REPORTS: Record<ReportKey, ReportDefinition> = {
  'program-a': programmeAReport,
  'program-b': programmeBReport,
  'program-c': programmeCReport,
  learners: allLearnersReport,
  trainers: trainersReport,
  sessions: sessionsReport,
  assessments: assessmentsReport,
  'assessment-results': assessmentResultsReport,
  assignments: assignmentsReport,
  certification: certificationReport,
  notifications: notificationsReport,
  attention: attentionReport,
}
