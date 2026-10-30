/**
 * Enumerations shared by the database schema, the zod DTOs and the UI. The Drizzle `pgEnum`s
 * in server/db/schema are built from these arrays, so a value is added in exactly one place.
 */

export const PROGRAMME_CODES = ['A', 'B', 'C'] as const
export type ProgrammeCode = (typeof PROGRAMME_CODES)[number]

export const PROGRAMME_STATUSES = ['draft', 'published', 'archived'] as const
export type ProgrammeStatus = (typeof PROGRAMME_STATUSES)[number]

export const ENROLMENT_STATUSES = [
  'not_started',
  'in_progress',
  'awaiting_review',
  'completed',
] as const
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number]

export const ORGANISATION_TYPES = [
  'hotel_accommodation',
  'tour_operator',
  'transport',
  'travel_trade',
  'attraction_venue',
  'public_sector',
  'education',
  'independent',
  'other',
] as const
export type OrganisationType = (typeof ORGANISATION_TYPES)[number]

export const JOB_FUNCTIONS = [
  'guest_services',
  'front_office',
  'guiding',
  'transport',
  'sales',
  'operations',
  'training',
  'management',
  'other',
] as const
export type JobFunction = (typeof JOB_FUNCTIONS)[number]

export const SENIORITY_LEVELS = [
  'student_trainee',
  'entry_level',
  'experienced_professional',
  'supervisor',
  'manager',
  'senior_leader',
  'independent_professional',
] as const
export type Seniority = (typeof SENIORITY_LEVELS)[number]

export const EXPERIENCE_BANDS = ['lt_1', '1_3', '4_7', '8_plus'] as const
export type ExperienceBand = (typeof EXPERIENCE_BANDS)[number]

export const LEARNING_GOALS = [
  'visitor_welcome',
  'communication',
  'complaint_handling',
  'guiding',
  'storytelling',
  'leadership',
] as const
export type LearningGoal = (typeof LEARNING_GOALS)[number]

export const WEEKLY_MINUTES = [15, 30, 60, 120] as const

export const PROFILE_STATUSES = ['draft', 'complete'] as const
export type ProfileStatus = (typeof PROFILE_STATUSES)[number]

export const COURSE_FORMATS = ['video', 'interactive', 'resource', 'session', 'preview'] as const
export type CourseFormat = (typeof COURSE_FORMATS)[number]

export const PACKAGE_TYPES = [
  'video',
  'scorm_2004',
  'scorm_12',
  'html_preview',
  'resource',
  // xAPI activity reporting to the simulated learning record store (29 Oct update).
  'xapi',
] as const
export type PackageType = (typeof PACKAGE_TYPES)[number]

export const PATH_VERSION_STATUSES = ['draft', 'published', 'archived'] as const
export type PathVersionStatus = (typeof PATH_VERSION_STATUSES)[number]

export const PATH_ITEM_KINDS = [
  'course',
  'assessment_pre',
  'assessment_post',
  'assessment_formative',
  'ai_practice',
  'session',
  'assignment',
] as const
export type PathItemKind = (typeof PATH_ITEM_KINDS)[number]

export const UNIT_PROGRESS_STATUSES = ['not_started', 'in_progress', 'completed'] as const
export type UnitProgressStatus = (typeof UNIT_PROGRESS_STATUSES)[number]

export const COMPETENCIES = [
  'discover_needs',
  'verify_information',
  'communicate_clearly',
  'recover_service',
  'protect_information',
] as const
export type Competency = (typeof COMPETENCIES)[number]

export const ASSESSMENT_KINDS = ['pre', 'post', 'formative'] as const
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number]

export const ATTEMPT_STATUSES = ['in_progress', 'submitted'] as const
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number]

export const ROLEPLAY_MODES = ['text', 'voice'] as const
export type RolePlayMode = (typeof ROLEPLAY_MODES)[number]

export const ROLEPLAY_CRITERIA = [
  'empathy_professionalism',
  'discovery_questions',
  'clarity',
  'accuracy_boundaries',
  'solution_followthrough',
] as const
export type RolePlayCriterion = (typeof ROLEPLAY_CRITERIA)[number]

export const SESSION_FORMATS = ['in_person', 'online'] as const
export type SessionFormat = (typeof SESSION_FORMATS)[number]

export const SESSION_STATUSES = ['draft', 'published', 'full', 'completed', 'cancelled'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

/**
 * `offered` is a waitlisted learner holding a time-limited seat offer (see SeatOfferRow). The seat
 * counts as reserved while offered, so it cannot be double booked. Appended last: ranks of the
 * older statuses are unchanged.
 */
export const RSVP_STATUSES = ['confirmed', 'waitlisted', 'cancelled', 'moved', 'offered'] as const
export type RsvpStatus = (typeof RSVP_STATUSES)[number]

export const ATTENDANCE_VALUES = ['pending', 'attended', 'late', 'absent', 'excused'] as const
export type AttendanceValue = (typeof ATTENDANCE_VALUES)[number]

export const SCORE_STATUSES = ['draft', 'final'] as const
export type ScoreStatus = (typeof SCORE_STATUSES)[number]

export const SUBMISSION_STATUSES = ['submitted', 'under_review', 'returned', 'approved'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

/** A trainer's final decision on a submission. */
export const REVIEW_STATUSES = ['returned', 'approved'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

/**
 * What a `reviews` row can hold: a saved draft mark (visible to markers only) or a final
 * decision. Learner views, progress and reports only ever read final rows.
 */
export const REVIEW_RECORD_STATUSES = ['draft', ...REVIEW_STATUSES] as const
export type ReviewRecordStatus = (typeof REVIEW_RECORD_STATUSES)[number]

export const CERTIFICATE_STATUSES = ['issued', 'revoked'] as const
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number]

export const NOTIFICATION_CHANNELS = ['in_app', 'email'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

/** Brief §11: simulated | queued | sent | failed. Seeded emails are always `simulated`. */
export const NOTIFICATION_STATES = ['simulated', 'queued', 'sent', 'failed'] as const
export type NotificationState = (typeof NOTIFICATION_STATES)[number]

export const RULE_STATUSES = ['draft', 'published', 'archived'] as const
export type RuleStatus = (typeof RULE_STATUSES)[number]

// --- 29 Oct update: waitlist offers, approvals, account controls ---------------------------------

export const SEAT_OFFER_STATUSES = ['offered', 'accepted', 'declined', 'expired'] as const
export type SeatOfferStatus = (typeof SEAT_OFFER_STATUSES)[number]

export const APPROVAL_TYPES = ['enrolment', 'external_certificate'] as const
export type ApprovalType = (typeof APPROVAL_TYPES)[number]

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'info_requested'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

/** Separate from programme approval, certificate validity and licence status. */
export const ACCOUNT_STATUSES = ['active', 'locked', 'disabled'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

// --- Assessment banks and rules -------------------------------------------------------------------

export const CONTENT_LANGUAGES = ['en', 'ar'] as const
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number]

export const QUESTION_TYPES = ['single', 'multiple', 'scenario'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number]

export const QUESTION_STATUSES = ['draft', 'published'] as const
export type QuestionStatus = (typeof QUESTION_STATUSES)[number]

export const FEEDBACK_RELEASES = ['immediate', 'after_submission', 'after_pass'] as const
export type FeedbackRelease = (typeof FEEDBACK_RELEASES)[number]

export const SCORE_POLICIES = ['best', 'latest'] as const
export type ScorePolicy = (typeof SCORE_POLICIES)[number]

// --- Credentials, CPD, external evidence, licence -----------------------------------------------

/** Derived (not stored) lifecycle of an issued credential: see shared/utils/credentials.ts. */
export const CREDENTIAL_LIFECYCLES = [
  'active',
  'expiring_soon',
  'expired',
  'revoked',
  'superseded',
] as const
export type CredentialLifecycle = (typeof CREDENTIAL_LIFECYCLES)[number]

export const CPD_SOURCES = ['academy', 'external'] as const
export type CpdSource = (typeof CPD_SOURCES)[number]

export const CPD_STATUSES = ['earned', 'pending', 'approved', 'rejected'] as const
export type CpdStatus = (typeof CPD_STATUSES)[number]

/** Hours and credits are never summed without a defined conversion (DemoSettings). */
export const CPD_UNITS = ['hours', 'credits'] as const
export type CpdUnit = (typeof CPD_UNITS)[number]

export const EXTERNAL_CERTIFICATE_STATUSES = [
  'pending',
  'verified',
  'rejected',
  'info_requested',
] as const
export type ExternalCertificateStatus = (typeof EXTERNAL_CERTIFICATE_STATUSES)[number]

export const LICENCE_STATUSES = ['active', 'expired', 'suspended', 'pending'] as const
export type LicenceStatus = (typeof LICENCE_STATUSES)[number]

// --- Content packages and the simulated learning record store ------------------------------------

export const CONTENT_FORMATS = ['scorm_2004', 'xapi'] as const
export type ContentFormat = (typeof CONTENT_FORMATS)[number]

// --- CRM integration (illustrative, simulated) ---------------------------------------------------

export const CRM_EVENT_TYPES = [
  'enrolment',
  'completion',
  'examination',
  'certification',
  'licence',
] as const
export type CrmEventType = (typeof CRM_EVENT_TYPES)[number]

export const CRM_DIRECTIONS = ['crm_to_lms', 'lms_to_crm'] as const
export type CrmDirection = (typeof CRM_DIRECTIONS)[number]

export const CRM_EVENT_STATUSES = ['processed', 'queued', 'failed', 'conflict'] as const
export type CrmEventStatus = (typeof CRM_EVENT_STATUSES)[number]
