/**
 * Illustrative, administrator-editable defaults (brief §5–6, §10). None of these is an official
 * Qatar Tourism policy; the UI should say so where it shows them.
 */
export const THRESHOLDS = {
  /** Program A, Level 1: foundation quiz pass mark (percent). */
  foundationQuizPass: 80,
  /** Trainer-led session: demo pass mark out of 100. Absence never counts as a pass. */
  sessionPass: 70,
  /** Practical assignment pass mark (percent). */
  assignmentPass: 70,
  /** Program A final (post) assessment pass mark (percent). */
  finalAssessmentPass: 80,
  /** Program B never blocks on the post score; below this it suggests a review. */
  programmeBReviewSuggested: 80,
  /** C01 video counts as complete at this share watched (percent). */
  videoCompletePercent: 90,
  /** C04 module quiz minimum (percent). */
  moduleQuizPass: 80,
  /** Self-service reschedule/cancel closes this many hours before the session. */
  selfServiceChangeHours: 24,
  /** Active learner = a recorded learning activity within this many days (brief §12). */
  activeLearnerDays: 30,
  /** "Inactive" learners in the operational panel (brief §12). */
  inactiveLearnerDays: 14,
  /** Marking is "overdue" after this many days waiting (demo default). */
  markingOverdueDays: 5,
} as const

/** Upload limits (brief §6). */
export const UPLOAD_LIMITS = {
  document: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.pdf', '.docx'],
  },
  video: {
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ['video/mp4'],
    extensions: ['.mp4'],
  },
} as const

/** Written-response word limits. */
export const WORD_LIMITS = {
  aAssignment: { min: 300, max: 500 },
  bShortResponse: { min: 100, max: 150 },
} as const

/** Pagination (brief §13): default 25, offer 50 and 100. */
export const PAGE_SIZES = [25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25

/** Role-play scoring (brief §9): five criteria 0–4, total out of 20, shown out of 100. */
export const ROLEPLAY_SCORING = { criteria: 5, maxPerCriterion: 4, maxTotal: 20 } as const

/** Baseline / post assessments (brief §8): five items, 0 or 20 each. */
export const ASSESSMENT_SCORING = { items: 5, pointsPerItem: 20 } as const

/** Seed data horizon (brief §15). */
export const ACTIVITY_WINDOW_DAYS = 90
