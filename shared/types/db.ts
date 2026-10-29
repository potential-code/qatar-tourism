import type {
  AssessmentKind,
  AttemptStatus,
  AttendanceValue,
  CertificateStatus,
  Competency,
  CourseFormat,
  EnrolmentStatus,
  ExperienceBand,
  JobFunction,
  NotificationChannel,
  NotificationState,
  OrganisationType,
  PackageType,
  PathItemKind,
  PathVersionStatus,
  ProfileStatus,
  ProgrammeCode,
  ProgrammeStatus,
  ReviewRecordStatus,
  RolePlayMode,
  RsvpStatus,
  RuleStatus,
  ScoreStatus,
  Seniority,
  SessionFormat,
  SessionStatus,
  SubmissionStatus,
  UnitProgressStatus,
} from '../constants'
import type { RuleGroup } from '../content/paths'
import type { Role } from '../roles'

/**
 * Row shapes of the demo's in-memory database (client/src/mocks/db.ts), one interface per table
 * of the former Postgres schema. Field names match the old Drizzle columns, so ported service
 * code reads the same.
 *
 * Instants are ISO 8601 strings in UTC (what the API used to send as JSON); compare them with
 * `Date.parse` or `new Date()`, never as local times. Calendar dates are `YYYY-MM-DD`.
 */

/** An instant, ISO 8601 UTC (e.g. 2026-10-27T05:00:00.000Z). */
export type IsoInstant = string
/** A calendar date, YYYY-MM-DD. */
export type IsoDate = string

type Timestamps = {
  createdAt: IsoInstant
  updatedAt: IsoInstant
}

// --- Accounts ---------------------------------------------------------------------------------

/** An account (formerly Better Auth `user`). Seeded accounts sign in with the demo password. */
export interface UserRow extends Timestamps {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: Role
}

/**
 * A simulated email verification code or password-reset token (formerly Better Auth
 * `verification`). `identifier` names the purpose and the address.
 */
export interface VerificationRow extends Timestamps {
  id: string
  identifier: string
  value: string
  expiresAt: IsoInstant
}

export interface OrganisationRow extends Timestamps {
  id: string
  code: string
  name: string
  type: OrganisationType
  city: string | null
  isPseudo: boolean
}

/** Learner profile (brief §4). `learnerCode` (L0001…) is what trainers see instead of an email. */
export interface ProfileRow extends Timestamps {
  id: string
  userId: string
  learnerCode: string
  fullName: string
  organisationId: string | null
  organisationOther: string | null
  jobTitle: string | null
  jobFunction: JobFunction | null
  seniority: Seniority | null
  experience: ExperienceBand | null
  country: string | null
  city: string | null
  preferredLanguage: string | null
  captionsPreference: boolean | null
  accessibilityRequest: string | null
  goals: string[]
  weeklyMinutes: number | null
  mobile: string | null
  wizardStep: number
  status: ProfileStatus
  consentAcceptedAt: IsoInstant | null
  marketingOptIn: boolean
  suspended: boolean
  registeredAt: IsoInstant
  lastActivityAt: IsoInstant | null
  completeness: number
}

export interface TrainerProfileRow extends Timestamps {
  id: string
  userId: string
  code: string
  fullName: string
  headline: string
  bio: string
  expertise: string[]
  languages: string[]
  organisation: string
  avatarPath: string | null
}

export interface TrainerProgrammeRow extends Timestamps {
  id: string
  trainerId: string
  programmeId: string
}

// --- Catalogue --------------------------------------------------------------------------------

export interface ProgrammeRow extends Timestamps {
  id: string
  code: ProgrammeCode
  title: string
  audience: string
  summary: string
  formatLabel: string
  durationLabel: string
  levels: number
  certificationEnabled: boolean
  isIllustrative: boolean
  status: ProgrammeStatus
  cardImagePath: string | null
  completionRules: Record<string, unknown>
}

export interface CourseRow extends Timestamps {
  id: string
  code: string
  title: string
  format: CourseFormat
  durationMinutes: number
  summary: string
  completionRule: Record<string, unknown>
  completionText: string
  transcript: string | null
  isActive: boolean
}

export interface ContentPackageRow extends Timestamps {
  id: string
  courseId: string
  type: PackageType
  version: string
  title: string
  launchUrl: string | null
  formatLabel: string
  isCurrent: boolean
}

export interface LearningPathRow extends Timestamps {
  id: string
  code: string
  programmeId: string
  name: string
  description: string
  isDefault: boolean
  currentVersionId: string | null
}

export interface PathVersionRow extends Timestamps {
  id: string
  pathId: string
  version: number
  status: PathVersionStatus
  changeNote: string | null
  publishedAt: IsoInstant | null
  publishedBy: string | null
}

export interface PathItemRow extends Timestamps {
  id: string
  pathVersionId: string
  position: number
  kind: PathItemKind
  courseId: string | null
  scenarioKey: string | null
  title: string
  required: boolean
  level: number
  stage: string
  note: string | null
}

export interface AssignmentRuleRow extends Timestamps {
  id: string
  code: string
  programmeId: string
  pathId: string
  name: string
  summary: string
  conditions: RuleGroup
  priority: number
  isDefault: boolean
  status: RuleStatus
}

// --- Learning ---------------------------------------------------------------------------------

export interface EnrolmentRow extends Timestamps {
  id: string
  learnerId: string
  programmeId: string
  status: EnrolmentStatus
  pathId: string | null
  pathVersionId: string | null
  assignmentReason: string | null
  overrideReason: string | null
  overriddenBy: string | null
  currentStage: string | null
  progressPercent: number
  enrolledAt: IsoInstant
  startedAt: IsoInstant | null
  completedAt: IsoInstant | null
  lastActivityAt: IsoInstant | null
}

/** Progress on one course for one enrolment, including the SCORM runtime fields. */
export interface UnitProgressRow extends Timestamps {
  id: string
  enrolmentId: string
  courseId: string
  status: UnitProgressStatus
  percent: number
  cmiCompletionStatus: string | null
  cmiSuccessStatus: string | null
  scoreRaw: number | null
  sessionTimeSeconds: number
  suspendData: string | null
  location: string | null
  completedAt: IsoInstant | null
  /** 'learner' for activity in this system; 'historical' for seeded pre-window history. */
  source: string
  extra: Record<string, unknown> | null
  lastActivityAt: IsoInstant | null
}

export interface AssessmentRow extends Timestamps {
  id: string
  code: string
  kind: AssessmentKind
  version: string
  title: string
  passPercent: number | null
}

export interface AssessmentAttemptRow extends Timestamps {
  id: string
  assessmentId: string
  enrolmentId: string
  learnerId: string
  attemptNo: number
  status: AttemptStatus
  score: number | null
  competencyScores: Record<string, number> | null
  startedAt: IsoInstant
  submittedAt: IsoInstant | null
}

export interface AssessmentAnswerRow extends Timestamps {
  id: string
  attemptId: string
  competency: Competency
  selectedOption: string
  points: number
}

export type TranscriptTurn = { speaker: 'visitor' | 'learner'; text: string }
export type CriterionFeedback = { key: string; score: number; evidence: string; suggestion: string }
export type RolePlayFeedback = {
  criteria: CriterionFeedback[]
  strength: string
  improve: string
  retry: string
}

/** Simulated AI practice attempt (brief §9): five criteria 0–4, total out of 20, shown out of 100. */
export interface RolePlayAttemptRow extends Timestamps {
  id: string
  enrolmentId: string
  learnerId: string
  scenarioKey: string
  mode: RolePlayMode
  transcript: TranscriptTurn[]
  empathyScore: number
  discoveryScore: number
  clarityScore: number
  accuracyScore: number
  solutionScore: number
  totalScore: number
  totalPercent: number
  feedback: RolePlayFeedback
  usedRecordedDemo: boolean
  completedAt: IsoInstant
}

// --- Sessions ---------------------------------------------------------------------------------

export interface SessionRow extends Timestamps {
  id: string
  code: string
  title: string
  programmeId: string
  level: string | null
  stage: string | null
  trainerId: string
  format: SessionFormat
  startsAt: IsoInstant
  endsAt: IsoInstant
  timezone: string
  capacity: number
  venue: string | null
  room: string | null
  accessNote: string | null
  meetingRef: string | null
  joinInstructions: string | null
  bookingDeadline: IsoInstant | null
  cancellationPolicy: string
  description: string
  materials: { title: string; url: string }[]
  prerequisite: string | null
  isCompletionGate: boolean
  status: SessionStatus
  cancelledReason: string | null
  createdBy: string | null
}

export interface SessionRescheduleRow extends Timestamps {
  id: string
  sessionId: string
  previousStartsAt: IsoInstant
  previousEndsAt: IsoInstant
  newStartsAt: IsoInstant
  newEndsAt: IsoInstant
  previousVenue: string | null
  newVenue: string | null
  reason: string
  affectedRsvps: number
  eventId: string
  changedBy: string | null
}

/** One row per booking attempt; cancelled and moved rows stay as history. */
export interface RsvpRow extends Timestamps {
  id: string
  sessionId: string
  learnerId: string
  status: RsvpStatus
  waitlistPosition: number | null
  replacedByRsvpId: string | null
  cancelledReason: string | null
  bookedAt: IsoInstant
}

export interface AttendanceRow extends Timestamps {
  id: string
  rsvpId: string
  sessionId: string
  learnerId: string
  status: AttendanceValue
  markedBy: string | null
  markedAt: IsoInstant | null
}

export interface SessionScoreRow extends Timestamps {
  id: string
  rsvpId: string
  sessionId: string
  learnerId: string
  preparation: number
  communication: number
  practical: number
  professionalism: number
  total: number
  status: ScoreStatus
  feedback: string | null
  correctionReason: string | null
  scoredBy: string | null
  finalisedAt: IsoInstant | null
}

// --- Assignments ------------------------------------------------------------------------------

export interface AssignmentRow extends Timestamps {
  id: string
  code: string
  programmeId: string
  title: string
  brief: string
  wordMin: number | null
  wordMax: number | null
  allowsUpload: boolean
  passPercent: number
}

/** One row per submitted version. */
export interface SubmissionRow extends Timestamps {
  id: string
  assignmentId: string
  enrolmentId: string
  learnerId: string
  version: number
  status: SubmissionStatus
  responseText: string | null
  wordCount: number | null
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  /** Key of the uploaded file in the browser upload store; null for seeded rows. */
  storagePath: string | null
  markerTrainerId: string | null
  submittedAt: IsoInstant
}

/** A draft mark (markers only) or a final decision. Learner views read final rows only. */
export interface ReviewRow extends Timestamps {
  id: string
  submissionId: string
  reviewerId: string | null
  rubricScore: number
  rubricBreakdown: Record<string, number> | null
  feedback: string
  status: ReviewRecordStatus
  draftDecision: ReviewRecordStatus | null
  reviewedAt: IsoInstant
}

export interface CertificateRow extends Timestamps {
  id: string
  code: string
  enrolmentId: string
  learnerId: string
  programmeId: string
  learnerName: string
  status: CertificateStatus
  issuedAt: IsoInstant
  issuedBy: string | null
  revokedAt: IsoInstant | null
  revokedBy: string | null
  revokeReason: string | null
  reissuedFromId: string | null
  evidence: Record<string, unknown>
}

// --- Messaging and governance -----------------------------------------------------------------

/** (eventId, recipientId, channel) is unique: retrying an action never duplicates messages. */
export interface NotificationRow extends Timestamps {
  id: string
  eventId: string
  kind: string
  recipientId: string
  channel: NotificationChannel
  state: NotificationState
  subject: string
  body: string
  sessionId: string | null
  actorId: string | null
  failureReason: string | null
  readAt: IsoInstant | null
}

/** Append-only audit trail (brief §11). */
export interface AuditEventRow {
  id: string
  actorId: string | null
  actorRole: string
  actorLabel: string | null
  action: string
  objectType: string
  objectId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reason: string | null
  outcome: 'allowed' | 'denied'
  requestId: string | null
  createdAt: IsoInstant
}

/** The demo snapshot the database was built from. */
export interface DemoMetaRow {
  referenceDate: IsoDate
  seedVersion: string
  seededAt: IsoInstant
  counts: Record<string, number>
}
