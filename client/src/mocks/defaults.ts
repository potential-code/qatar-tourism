import type { Row, TableName } from './tables'

/**
 * Column defaults: the values Postgres used to fill in when an insert left a nullable or
 * defaulted column out. Factories, so array and object defaults are never shared between rows.
 * `id`, `createdAt` and `updatedAt` are not defaulted here; `services/api.ts insertRow` sets them.
 */
export const COLUMN_DEFAULTS = {
  users: () => ({ emailVerified: false, image: null, role: 'learner' as const }),
  verifications: () => ({}),
  organisations: () => ({ city: null, isPseudo: false }),
  profiles: () => ({
    organisationId: null,
    organisationOther: null,
    jobTitle: null,
    jobFunction: null,
    seniority: null,
    experience: null,
    country: null,
    city: null,
    preferredLanguage: null,
    captionsPreference: null,
    accessibilityRequest: null,
    goals: [] as string[],
    weeklyMinutes: null,
    mobile: null,
    wizardStep: 1,
    status: 'draft' as const,
    consentAcceptedAt: null,
    marketingOptIn: false,
    suspended: false,
    lastActivityAt: null,
    completeness: 0,
  }),
  trainerProfiles: () => ({
    expertise: [] as string[],
    languages: [] as string[],
    avatarPath: null,
  }),
  trainerProgrammes: () => ({}),
  programmes: () => ({
    levels: 1,
    certificationEnabled: false,
    isIllustrative: false,
    status: 'draft' as const,
    cardImagePath: null,
    completionRules: {} as Record<string, unknown>,
  }),
  courses: () => ({ transcript: null, isActive: true }),
  contentPackages: () => ({ version: '1.0', launchUrl: null, isCurrent: true }),
  learningPaths: () => ({ isDefault: false, currentVersionId: null }),
  pathVersions: () => ({
    status: 'draft' as const,
    changeNote: null,
    publishedAt: null,
    publishedBy: null,
  }),
  pathItems: () => ({ courseId: null, scenarioKey: null, required: true, level: 1, note: null }),
  assignmentRules: () => ({ priority: 0, isDefault: false, status: 'published' as const }),
  enrolments: () => ({
    status: 'not_started' as const,
    pathId: null,
    pathVersionId: null,
    assignmentReason: null,
    overrideReason: null,
    overriddenBy: null,
    currentStage: null,
    progressPercent: 0,
    startedAt: null,
    completedAt: null,
    lastActivityAt: null,
  }),
  unitProgress: () => ({
    status: 'not_started' as const,
    percent: 0,
    cmiCompletionStatus: null,
    cmiSuccessStatus: null,
    scoreRaw: null,
    sessionTimeSeconds: 0,
    suspendData: null,
    location: null,
    completedAt: null,
    source: 'learner',
    extra: null,
    lastActivityAt: null,
  }),
  assessments: () => ({ passPercent: null }),
  assessmentAttempts: () => ({
    attemptNo: 1,
    status: 'in_progress' as const,
    score: null,
    competencyScores: null,
    submittedAt: null,
  }),
  assessmentAnswers: () => ({}),
  rolePlayAttempts: () => ({ usedRecordedDemo: false }),
  sessions: () => ({
    level: null,
    stage: null,
    timezone: 'Asia/Qatar',
    venue: null,
    room: null,
    accessNote: null,
    meetingRef: null,
    joinInstructions: null,
    bookingDeadline: null,
    materials: [] as { title: string; url: string }[],
    prerequisite: null,
    isCompletionGate: false,
    status: 'draft' as const,
    cancelledReason: null,
    createdBy: null,
  }),
  sessionReschedules: () => ({
    previousVenue: null,
    newVenue: null,
    affectedRsvps: 0,
    changedBy: null,
  }),
  rsvps: () => ({ waitlistPosition: null, replacedByRsvpId: null, cancelledReason: null }),
  attendance: () => ({ status: 'pending' as const, markedBy: null, markedAt: null }),
  sessionScores: () => ({
    status: 'draft' as const,
    feedback: null,
    correctionReason: null,
    scoredBy: null,
    finalisedAt: null,
  }),
  assignments: () => ({ wordMin: null, wordMax: null, allowsUpload: false, passPercent: 70 }),
  submissions: () => ({
    version: 1,
    status: 'submitted' as const,
    responseText: null,
    wordCount: null,
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    storagePath: null,
    markerTrainerId: null,
  }),
  reviews: () => ({ reviewerId: null, rubricBreakdown: null, draftDecision: null }),
  certificates: () => ({
    status: 'issued' as const,
    issuedBy: null,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    reissuedFromId: null,
    evidence: {} as Record<string, unknown>,
  }),
  notifications: () => ({
    state: 'simulated' as const,
    sessionId: null,
    actorId: null,
    failureReason: null,
    readAt: null,
  }),
  auditEvents: () => ({
    actorId: null,
    actorLabel: null,
    objectId: null,
    before: null,
    after: null,
    reason: null,
    outcome: 'allowed' as const,
    requestId: null,
  }),
} satisfies { [T in TableName]: () => Partial<Row<T>> }

type DefaultedKeys<T extends TableName> = keyof ReturnType<(typeof COLUMN_DEFAULTS)[T]> &
  keyof Row<T>

/** A row as an insert: defaulted columns may be left out (as with the old database). */
export type NewRow<T extends TableName> = Omit<Row<T>, DefaultedKeys<T>> &
  Partial<Pick<Row<T>, DefaultedKeys<T>>>

/** Fills the defaulted columns a new row left out. Keys set to `undefined` take the default. */
export function withDefaults<T extends TableName>(table: T, values: NewRow<T>): Row<T> {
  const row: Record<string, unknown> = { ...COLUMN_DEFAULTS[table]() }
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) row[key] = value
  }
  return row as unknown as Row<T>
}
