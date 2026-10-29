import { THRESHOLDS } from '@shared/constants'
import { pickVisibleLearnerFields } from '@shared/permissions'
import type { Role } from '@shared/roles'
import { rubricFor } from '@shared/schemas/assignment-marking'
import type { AuditEventRow, ReviewRow, SubmissionRow } from '@shared/types/db'
import { DAY_MS, now } from '../api'
import type { VersionRow } from './queries'
import { isStoredPath } from './storage'

/** View shapes for the assignment screens (formerly assignments.dto.ts). Dates are ISO strings. */

export function fileView(row: SubmissionRow) {
  if (!row.fileName) return null
  return {
    name: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    /** False for seeded records, which carry file details only. */
    stored: isStoredPath(row.storagePath),
  }
}

export function reviewView(row: VersionRow) {
  if (!row.review) return null
  return {
    score: row.review.rubricScore,
    breakdown: row.review.rubricBreakdown ?? null,
    feedback: row.review.feedback,
    status: row.review.status,
    reviewedAt: row.review.reviewedAt,
    reviewerName: row.markerName ?? row.reviewerName,
  }
}

type Correction = {
  at: string
  reason: string | null
  before: unknown
  after: unknown
  by: string | null
}

export function correctionsOf(events: AuditEventRow[], submissionId: string): Correction[] {
  return events
    .filter((e) => e.action === 'marking.correct' && e.objectId === submissionId)
    .map((e) => ({
      at: e.createdAt,
      reason: e.reason,
      before: e.before,
      after: e.after,
      by: e.actorLabel,
    }))
}

/** One version for the learner: no draft marks, no internal correction reasons. */
export function learnerVersionView(row: VersionRow, events: AuditEventRow[]) {
  const corrections = correctionsOf(events, row.submission.id)
  return {
    id: row.submission.id,
    version: row.submission.version,
    status: row.submission.status,
    responseText: row.submission.responseText,
    wordCount: row.submission.wordCount,
    file: fileView(row.submission),
    submittedAt: row.submission.submittedAt,
    markerName: row.markerName,
    review: reviewView(row),
    correctedAt: corrections.at(-1)?.at ?? null,
  }
}

/** One version for a marker: includes the audit trail of drafts, finalisation and corrections. */
export function markerVersionView(row: VersionRow, events: AuditEventRow[]) {
  return {
    ...learnerVersionView(row, events),
    corrections: correctionsOf(events, row.submission.id),
  }
}

/** The marker's saved draft (a `draft` review row), shown only to markers. */
export function draftView(row: ReviewRow | null) {
  if (!row) return null
  return {
    savedAt: row.reviewedAt,
    breakdown: row.rubricBreakdown ?? {},
    feedback: row.feedback,
    decision: row.draftDecision === 'draft' ? null : row.draftDecision,
  }
}

export function learnerIdentity(role: Role, learnerCode: string, learnerName: string) {
  // Trainers get the learner ID and permitted display name only: no email or phone (brief §11).
  const visible = pickVisibleLearnerFields(role, { learnerCode, displayName: learnerName })
  return {
    learnerCode: String(visible.learnerCode ?? learnerCode),
    displayName: String(visible.displayName ?? ''),
  }
}

export function waiting(submittedAt: string, open: boolean) {
  const days = Math.max(0, Math.floor((now().getTime() - Date.parse(submittedAt)) / DAY_MS))
  return { waitingDays: days, overdue: open && days >= THRESHOLDS.markingOverdueDays }
}

export function rubricView(assignmentCode: string) {
  return rubricFor(assignmentCode).map((item) => ({ ...item }))
}
