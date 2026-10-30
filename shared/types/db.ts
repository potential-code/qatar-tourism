import type {
  AccountStatus,
  ApprovalStatus,
  ApprovalType,
  AssessmentKind,
  AttemptStatus,
  AttendanceValue,
  CertificateStatus,
  Competency,
  ContentLanguage,
  CourseFormat,
  CpdSource,
  CpdStatus,
  CpdUnit,
  CrmDirection,
  CrmEventStatus,
  CrmEventType,
  EnrolmentStatus,
  ExperienceBand,
  ExternalCertificateStatus,
  FeedbackRelease,
  JobFunction,
  LicenceStatus,
  NotificationChannel,
  NotificationState,
  OrganisationType,
  PackageType,
  PathItemKind,
  PathVersionStatus,
  ProfileStatus,
  ProgrammeCode,
  ProgrammeStatus,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  ReviewRecordStatus,
  RolePlayMode,
  RsvpStatus,
  RuleStatus,
  ScorePolicy,
  ScoreStatus,
  SeatOfferStatus,
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
  /**
   * Legacy flag: the account is disabled (suspended accounts cannot sign in). Kept for the
   * existing user-management code. Read `accountStatusOf(profile)` (shared/utils/account.ts), which
   * folds it into `accountStatus`: suspended === true reads as 'disabled'.
   */
  suspended: boolean
  /** Active, locked (temporary, reversible, reason required) or disabled. Default 'active'. */
  accountStatus: AccountStatus
  /** Why the account was locked (shown to admins; the learner sees only "Contact Academy support"). */
  lockReason: string | null
  lockedAt: IsoInstant | null
  /** User id of the admin who locked it. */
  lockedBy: string | null
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
  /**
   * Content Library fields (29 Oct). Null on the original per-course packages. A library variant
   * has a stable `packageId`, a `courseKey` shared by its language variants, and `isCurrent: false`
   * so the existing course player (which reads the current package) is unaffected until lane B
   * wires them in.
   */
  packageId: string | null
  /** Shared course identity: the EN and AR variants of one item carry the same key. */
  courseKey: string | null
  language: ContentLanguage
  /** Who may launch it, e.g. 'assigned-learners'. Illustrative. */
  accessGroup: string | null
  publishedAt: IsoInstant | null
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
  /** Rule used for this attempt (AssessmentRuleRow id and its version); null for seeded history. */
  ruleId: string | null
  ruleVersion: number | null
  /**
   * The questions drawn, frozen at start, so editing the bank never alters a completed attempt.
   * Null for seeded history. Reload resumes the same snapshot; a retake draws a new one.
   */
  snapshot: AttemptSnapshot | null
  /** Time limit deadline for an in-progress attempt (startedAt + timeLimitMinutes). */
  deadlineAt: IsoInstant | null
}

export interface AttemptSnapshotItem {
  questionId: string
  version: number
  /** Option keys in the order shown to this learner. */
  optionOrder: string[]
  /** Option and prompt text as authored at draw time (the language the attempt used). */
  language: ContentLanguage
}

export interface AttemptSnapshot {
  items: AttemptSnapshotItem[]
  seed: string
}

export interface AssessmentAnswerRow extends Timestamps {
  id: string
  attemptId: string
  competency: Competency
  /** The selected option key; several keys joined by a comma for a multiple-choice answer. */
  selectedOption: string
  points: number
  /** The question answered (QuestionBankRow.questionId). Null for answers on seeded history. */
  questionId: string | null
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
  /**
   * Validity end. Null only for rows with no expiry. Lifecycle (active / expiring_soon / expired /
   * revoked / superseded) is derived with `credentialLifecycle()` (shared/utils/credentials.ts),
   * never stored, so the demo clock moves it.
   */
  expiresAt: IsoInstant | null
  /** Credential rule version the issue used (CredentialRuleRow is part of DemoSettings for now). */
  ruleVersion: string
  /** CPD hours this credential counts for, in the Academy's configured unit. */
  cpdHours: number
  /** The earlier credential this one renews. That earlier row is then 'superseded', never deleted. */
  supersedesId: string | null
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
  /**
   * Whole days the presenter has advanced the demo clock (services/clock.ts adds it to `now()`).
   * 0 after seeding and after a reset. Never change `referenceDate` to move time.
   */
  clockOffsetDays: number
}

/**
 * Configurable thresholds ("Demo settings — subject to Qatar Tourism confirmation"). One record,
 * `db.settings`; every lane reads limits from here, never from a literal. Edited through
 * `services/demo-settings.service.ts`.
 */
export interface DemoSettings {
  /** Hours a waitlisted learner has to accept an offered seat. */
  seatOfferWindowHours: number
  /** Credential validity in months from issue. */
  credentialValidityMonths: number
  /** Annual CPD target for the demo cycle, in `cpdUnit`. */
  cpdTarget: number
  cpdUnit: CpdUnit
  /** Hours per credit, the only defined conversion between CPD units. */
  cpdHoursPerCredit: number
  /** Days before expiry that a reminder is sent, largest first. */
  reminderDaysBefore: number[]
  /** Whether completed Program B courses earn CPD. Off until Qatar Tourism confirms. */
  programmeBCpdEnabled: boolean
  /** CPD earned per completed Program B course when the rule above is on. */
  programmeBCpdPerCourse: number
}

// --- 29 Oct update: waitlist offers, approvals ------------------------------------------------

/**
 * A time-limited offer of a freed seat to the first eligible waitlisted learner. While `offered`
 * the linked RSVP has status 'offered' and the seat counts as reserved.
 */
export interface SeatOfferRow extends Timestamps {
  id: string
  sessionId: string
  rsvpId: string
  learnerId: string
  offeredAt: IsoInstant
  /** offeredAt + DemoSettings.seatOfferWindowHours. */
  expiresAt: IsoInstant
  status: SeatOfferStatus
  /** When it left 'offered' (accepted, declined or expired). */
  resolvedAt: IsoInstant | null
}

/**
 * A request an admin must decide: a programme enrolment, or an external certificate. For a full
 * session, approval comes first and never bypasses capacity.
 */
export interface ApprovalRequestRow extends Timestamps {
  id: string
  /** Display id, REQ-0001 … */
  code: string
  type: ApprovalType
  learnerId: string
  /** Enrolment requests: the programme asked for (A, B or C). Null for external certificates. */
  programmeId: string | null
  /** Enrolment requests for a session: the session the learner wants, when any. */
  sessionId: string | null
  /** External-certificate requests: ExternalCertificateRow id. */
  externalCertificateId: string | null
  submittedAt: IsoInstant
  /** Assigned reviewer (admin user id). */
  reviewerId: string | null
  /** Evidence summary shown to the reviewer (file name, note). */
  evidence: ApprovalEvidence
  status: ApprovalStatus
  /** Decision reason (required to reject; shown to the learner with the next step). */
  reason: string | null
  decidedAt: IsoInstant | null
  decidedBy: string | null
}

export interface ApprovalEvidence {
  note: string
  fileName: string | null
}

// --- Question banks and assessment rules --------------------------------------------------------

export interface QuestionOption {
  key: string
  text: string
}

/**
 * One question variant. EN and AR variants of the same question share `sharedId`. Editing a
 * published question creates a new `version`; attempt snapshots keep the version they drew.
 */
export interface QuestionBankRow extends Timestamps {
  id: string
  /** Display id, e.g. Q-DN-001-EN. */
  questionId: string
  /** Links the EN and AR variants, e.g. QS-DN-001. */
  sharedId: string
  competency: Competency
  /** Programme the item belongs to; 'all' serves both A and B. */
  programme: 'A' | 'B' | 'all'
  difficulty: QuestionDifficulty
  language: ContentLanguage
  type: QuestionType
  prompt: string
  options: QuestionOption[]
  /** Correct option keys (one for single and scenario, several for multiple). */
  correct: string[]
  feedback: string
  points: number
  version: number
  status: QuestionStatus
}

export interface DrawRule {
  competency: Competency
  difficulty: QuestionDifficulty | 'any'
  count: number
}

/** Pre or post assessment rule for a programme. Publishing creates a new `version`. */
export interface AssessmentRuleRow extends Timestamps {
  id: string
  kind: Extract<AssessmentKind, 'pre' | 'post'>
  programme: 'A' | 'B'
  /** The assessment (assessments table) these rules govern. */
  assessmentId: string
  drawCount: number
  draws: DrawRule[]
  randomiseQuestions: boolean
  randomiseOptions: boolean
  /** Null for the pre assessment: no pass gate. */
  passPercent: number | null
  attemptLimit: number
  timeLimitMinutes: number | null
  feedbackRelease: FeedbackRelease
  scorePolicy: ScorePolicy
  version: number
  status: QuestionStatus
}

/** One extra attempt an admin granted to a learner, with the recorded reason. */
export interface AttemptGrantRow extends Timestamps {
  id: string
  assessmentId: string
  enrolmentId: string
  learnerId: string
  grantedBy: string
  reason: string
  grantedAt: IsoInstant
  /** The attempt that used it; null while unused. */
  consumedByAttemptId: string | null
}

// --- Credentials, CPD, licence ------------------------------------------------------------------

/** One line of the CPD ledger. Academy lines come from credentials; external from reviews. */
export interface CpdLedgerRow extends Timestamps {
  id: string
  learnerId: string
  source: CpdSource
  /** Amount in `unit`. */
  hours: number
  unit: CpdUnit
  /** earned (Academy), pending / approved / rejected (external). Only earned and approved count. */
  status: CpdStatus
  title: string
  earnedOn: IsoDate
  certificateId: string | null
  externalCertificateId: string | null
  /** Program B completions, when that rule is on. */
  enrolmentId: string | null
}

/** A certificate earned elsewhere, submitted by the learner for review. Never an Academy credential. */
export interface ExternalCertificateRow extends Timestamps {
  id: string
  learnerId: string
  title: string
  issuer: string
  externalRef: string
  issuedOn: IsoDate
  expiresOn: IsoDate | null
  claimedAmount: number
  unit: CpdUnit
  competency: Competency | null
  /** Key of the evidence file in the browser upload store, or a seeded sample id. */
  evidenceFileId: string | null
  evidenceFileName: string | null
  verificationUrl: string | null
  status: ExternalCertificateStatus
  /** CPD the reviewer recognised (can differ from the claim). Null until decided. */
  recognisedAmount: number | null
  reviewerId: string | null
  reviewedAt: IsoInstant | null
  reason: string | null
  submittedAt: IsoInstant
}

/**
 * Professional licence status. A separate field sourced from the configured system (the CRM, as
 * illustrative authority). A passed exam or valid certificate never implies a valid licence.
 */
export interface LicenceStatusRow extends Timestamps {
  id: string
  learnerId: string
  status: LicenceStatus
  source: 'crm'
  /** An LMS-to-CRM change request, pending until the CRM acknowledges it. */
  pendingRequest: { requestedStatus: LicenceStatus; requestedAt: IsoInstant; reason: string } | null
}

// --- Content library and simulated LRS ----------------------------------------------------------

/** An xAPI statement in the simulated learning record store (always labelled simulated). */
export interface XapiStatementRow {
  id: string
  /** Statement id (UUID), immutable. */
  statementId: string
  actorLearnerId: string
  verb: string
  activityId: string
  packageId: string
  timestamp: IsoInstant
  result: Record<string, unknown> | null
  simulatedLrs: true
}

// --- CRM integration (illustrative, simulated) -------------------------------------------------

/** Links an LMS learner to a CRM record. The external id is stable and used for matching. */
export interface CrmMappingRow extends Timestamps {
  id: string
  /** A field mapping row ('field') or a learner identity link ('learner'). */
  kind: 'field' | 'learner'
  /** field: CRM field name; learner: unused. */
  crmField: string | null
  lmsField: string | null
  dataType: string | null
  direction: CrmDirection | 'both'
  transformation: string | null
  required: boolean
  authoritative: 'crm' | 'lms'
  /** learner links: LMS learner (user id) and the CRM id (e.g. CRM-0042). */
  learnerId: string | null
  externalLearnerId: string | null
  /** 'matched', or 'review' for a missing or ambiguous identity match. */
  matchState: 'matched' | 'review' | null
}

export interface CrmEventRow {
  id: string
  /** Immutable event id used for dedup, e.g. EVT-0001. */
  eventId: string
  type: CrmEventType
  direction: CrmDirection
  learnerId: string | null
  externalLearnerId: string | null
  /** Enrolment, credential or attempt id the event concerns. */
  entityId: string | null
  status: CrmEventStatus
  attempts: number
  error: string | null
  payload: Record<string, unknown>
  occurredAt: IsoInstant
  processedAt: IsoInstant | null
  createdAt: IsoInstant
  updatedAt: IsoInstant
}

/** Illustrative integration configuration. No real endpoints or secrets, ever. */
export interface IntegrationSettingRow extends Timestamps {
  id: string
  /** One row per area. */
  area: 'sso' | 'api' | 'contentHosting' | 'dataResidency' | 'crm'
  config: Record<string, unknown>
  /** Connection state label shown in the UI, e.g. 'Not configured', 'Connected demo'. */
  state: string
  lastTestAt: IsoInstant | null
}
