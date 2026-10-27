import type {
  AttendanceValue,
  EnrolmentStatus,
  JobFunction,
  OrganisationType,
  ProgrammeCode,
  Seniority,
  SessionFormat,
  SessionStatus,
  SubmissionStatus,
} from '@shared/constants'

/**
 * Facts the governed metrics are computed from. One `EnrolmentFact` per enrolment, carrying the
 * learner attributes the brief §12 filters slice by, plus the evidence each programme's funnel
 * steps need. Loaded once per request by `analytics.service.ts`; every metric is a pure
 * function over these facts, so the dashboard, the reports and the AI assistant cannot disagree.
 */
export type AttemptFact = {
  score: number
  version: string
  attemptNo: number
  submittedAt: Date | null
  competencyScores: Record<string, number> | null
}

export type EnrolmentFact = {
  enrolmentId: string
  learnerId: string
  learnerCode: string
  learnerName: string
  programme: ProgrammeCode
  status: EnrolmentStatus
  pathId: string | null
  pathName: string | null
  pathVersion: number | null
  currentStage: string | null
  progress: number
  enrolledAt: Date
  startedAt: Date | null
  completedAt: Date | null
  lastActivityAt: Date | null
  registeredAt: Date
  organisationId: string | null
  organisationName: string | null
  organisationType: OrganisationType | null
  jobTitle: string | null
  jobFunction: JobFunction | null
  seniority: Seniority | null
  suspended: boolean
  pre: AttemptFact | null
  post: AttemptFact | null
  foundation: AttemptFact | null
  /** Course codes completed on this enrolment (C01…C07). */
  completedUnits: ReadonlySet<string>
  hasRolePlay: boolean
  /** Latest submission (highest version), if any. */
  submission: {
    id: string
    status: SubmissionStatus
    version: number
    submittedAt: Date
    markerTrainerId: string | null
    reviewScore: number | null
  } | null
  certificateIssued: boolean
}

export type SessionFact = {
  sessionId: string
  code: string
  title: string
  programme: ProgrammeCode
  trainerId: string
  trainerCode: string
  trainerName: string
  format: SessionFormat
  status: SessionStatus
  startsAt: Date
  endsAt: Date
  capacity: number
  venue: string | null
  room: string | null
  confirmed: number
  waitlisted: number
}

export type AttendanceFact = {
  sessionId: string
  learnerId: string
  programme: ProgrammeCode
  format: SessionFormat
  status: AttendanceValue
  sessionStatus: SessionStatus
  startsAt: Date
}

export type DraftScoreFact = {
  sessionId: string
  trainerId: string
  updatedAt: Date
}

export type Facts = {
  enrolments: EnrolmentFact[]
  sessions: SessionFact[]
  attendance: AttendanceFact[]
  draftScores: DraftScoreFact[]
  trainers: { id: string; code: string; name: string }[]
  /** The demo "now" these facts were read at (brief §12: "as of the demo reporting date"). */
  asOf: Date
}
