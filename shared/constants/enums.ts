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

export const RSVP_STATUSES = ['confirmed', 'waitlisted', 'cancelled', 'moved'] as const
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
