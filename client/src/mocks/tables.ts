import type {
  AssessmentAnswerRow,
  AssessmentAttemptRow,
  AssessmentRow,
  AssignmentRow,
  AssignmentRuleRow,
  AttendanceRow,
  AuditEventRow,
  CertificateRow,
  ContentPackageRow,
  CourseRow,
  EnrolmentRow,
  LearningPathRow,
  NotificationRow,
  OrganisationRow,
  PathItemRow,
  PathVersionRow,
  ProfileRow,
  ProgrammeRow,
  ReviewRow,
  RolePlayAttemptRow,
  RsvpRow,
  SessionRescheduleRow,
  SessionRow,
  SessionScoreRow,
  SubmissionRow,
  TrainerProfileRow,
  TrainerProgrammeRow,
  UnitProgressRow,
  UserRow,
  VerificationRow,
} from '@shared/types/db'

/**
 * The demo database's tables: collection name → row type. The names follow the old Drizzle
 * schema exports (`user` became `users`), so a ported query reads `db.enrolments.filter(...)`.
 */
export interface DemoTables {
  users: UserRow
  verifications: VerificationRow
  organisations: OrganisationRow
  profiles: ProfileRow
  trainerProfiles: TrainerProfileRow
  trainerProgrammes: TrainerProgrammeRow
  programmes: ProgrammeRow
  courses: CourseRow
  contentPackages: ContentPackageRow
  learningPaths: LearningPathRow
  pathVersions: PathVersionRow
  pathItems: PathItemRow
  assignmentRules: AssignmentRuleRow
  enrolments: EnrolmentRow
  unitProgress: UnitProgressRow
  assessments: AssessmentRow
  assessmentAttempts: AssessmentAttemptRow
  assessmentAnswers: AssessmentAnswerRow
  rolePlayAttempts: RolePlayAttemptRow
  sessions: SessionRow
  sessionReschedules: SessionRescheduleRow
  rsvps: RsvpRow
  attendance: AttendanceRow
  sessionScores: SessionScoreRow
  assignments: AssignmentRow
  submissions: SubmissionRow
  reviews: ReviewRow
  certificates: CertificateRow
  notifications: NotificationRow
  auditEvents: AuditEventRow
}

export type TableName = keyof DemoTables
export type Row<T extends TableName> = DemoTables[T]

/** Every table as an array: the shape of the collections inside `DemoDb`. */
export type DemoCollections = { [T in TableName]: DemoTables[T][] }

export const TABLE_NAMES = [
  'users',
  'verifications',
  'organisations',
  'profiles',
  'trainerProfiles',
  'trainerProgrammes',
  'programmes',
  'courses',
  'contentPackages',
  'learningPaths',
  'pathVersions',
  'pathItems',
  'assignmentRules',
  'enrolments',
  'unitProgress',
  'assessments',
  'assessmentAttempts',
  'assessmentAnswers',
  'rolePlayAttempts',
  'sessions',
  'sessionReschedules',
  'rsvps',
  'attendance',
  'sessionScores',
  'assignments',
  'submissions',
  'reviews',
  'certificates',
  'notifications',
  'auditEvents',
] as const satisfies readonly TableName[]
