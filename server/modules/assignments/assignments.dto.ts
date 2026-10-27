import type { AuditEventRow } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { THRESHOLDS } from '@shared/constants'
import { pickVisibleLearnerFields } from '@shared/permissions'
import type { Role } from '@shared/roles'
import { rubricFor } from '@shared/schemas/assignment-marking'
import type { VersionRow } from './assignments.queries'

/** Response shapes. Dates go over the wire as ISO strings; Qatar time is rendered client-side. */

const DAY_MS = 86_400_000

export function fileView(row: VersionRow['submission']) {
  if (!row.fileName) return null
  return {
    name: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    /** False for seeded records, which carry file details only. */
    stored: Boolean(row.storagePath?.startsWith('submissions')),
  }
}

export function reviewView(row: VersionRow) {
  if (!row.review) return null
  return {
    score: row.review.rubricScore,
    breakdown: row.review.rubricBreakdown ?? null,
    feedback: row.review.feedback,
    status: row.review.status,
    reviewedAt: row.review.reviewedAt.toISOString(),
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
      at: e.createdAt.toISOString(),
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
    submittedAt: row.submission.submittedAt.toISOString(),
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

export function latestDraft(events: AuditEventRow[], submissionId: string) {
  const draft = events
    .filter((e) => e.action === 'marking.draft' && e.objectId === submissionId)
    .at(-1)
  if (!draft) return null
  const after = (draft.after ?? {}) as {
    breakdown?: Record<string, number>
    feedback?: string
    decision?: 'returned' | 'approved' | null
  }
  return {
    savedAt: draft.createdAt.toISOString(),
    breakdown: after.breakdown ?? {},
    feedback: after.feedback ?? '',
    decision: after.decision ?? null,
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

export function waiting(submittedAt: Date, open: boolean) {
  const days = Math.max(0, Math.floor((now().getTime() - submittedAt.getTime()) / DAY_MS))
  return { waitingDays: days, overdue: open && days >= THRESHOLDS.markingOverdueDays }
}

export function rubricView(assignmentCode: string) {
  return rubricFor(assignmentCode).map((item) => ({ ...item }))
}
