import { and, eq, ne } from 'drizzle-orm'
import { reviews, submissions } from './schema'

/**
 * `reviews` also holds draft marks, which only markers may see. Every learner view, progress
 * rule, report and KPI reads final reviews through these conditions.
 */
export const isFinalReview = ne(reviews.status, 'draft')

/** Join condition: the submission's final review, if any. */
export const finalReviewOfSubmission = and(eq(reviews.submissionId, submissions.id), isFinalReview)
