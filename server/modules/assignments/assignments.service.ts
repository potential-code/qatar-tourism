import { db } from '@server/db/connection'
import {
  assignments,
  enrolments,
  programmes,
  rsvps,
  sessions,
  submissions,
  trainerProfiles,
  trainerProgrammes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Scope } from '@server/middleware/scope.middleware'
import { assertSubmissionInScope } from '@server/middleware/scope.middleware'
import { notify } from '@server/modules/notifications/notifications.service'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import {
  countWords,
  type SubmitInput,
  type UploadStartInput,
} from '@shared/schemas/assignment-marking'
import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm'
import {
  assignmentsForProgrammes,
  learnerEnrolments,
  markingEvents,
  submissionContext,
  versionsOf,
} from './assignments.queries'
import * as storage from './assignments.storage'

/** Learner side of assignments (brief §5 step 6, §6): read, upload, submit, resubmit. */

const OPEN_STATUSES = ['submitted', 'under_review'] as const

export async function listForLearner(learnerId: string) {
  const enrolmentRows = (await learnerEnrolments(learnerId)).filter((e) => e.programmeCode !== 'C')
  const definitions = await assignmentsForProgrammes(enrolmentRows.map((e) => e.programmeId))
  return Promise.all(
    definitions.map(async (assignment) => {
      const enrolment = enrolmentRows.find((e) => e.programmeId === assignment.programmeId)
      if (!enrolment) throw HttpError.notFound()
      const versions = await versionsOf(assignment.id, enrolment.id)
      const events = await markingEvents(versions.map((v) => v.submission.id))
      return { assignment, enrolment, versions, events }
    }),
  )
}

/** Who marks a first submission: the trainer the learner trained with, else the least busy. */
async function chooseMarker(learnerId: string, programmeId: string): Promise<string | null> {
  const [booked] = await db
    .select({ trainerId: sessions.trainerId })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .where(
      and(
        eq(rsvps.learnerId, learnerId),
        eq(sessions.programmeId, programmeId),
        ne(sessions.status, 'cancelled'),
        inArray(rsvps.status, ['confirmed', 'moved']),
      ),
    )
    .orderBy(desc(sessions.startsAt))
    .limit(1)
  if (booked) return booked.trainerId

  const loads = await db
    .select({
      trainerId: trainerProgrammes.trainerId,
      code: trainerProfiles.code,
      open: count(submissions.id),
    })
    .from(trainerProgrammes)
    .innerJoin(trainerProfiles, eq(trainerProfiles.id, trainerProgrammes.trainerId))
    .leftJoin(
      submissions,
      and(
        eq(submissions.markerTrainerId, trainerProgrammes.trainerId),
        inArray(submissions.status, [...OPEN_STATUSES]),
      ),
    )
    .where(eq(trainerProgrammes.programmeId, programmeId))
    .groupBy(trainerProgrammes.trainerId, trainerProfiles.code)
    .orderBy(asc(count(submissions.id)), asc(trainerProfiles.code))
  return loads[0]?.trainerId ?? null
}

async function ownedAssignment(learnerId: string, assignmentId: string, enrolmentId?: string) {
  const [row] = await db
    .select({ assignment: assignments, enrolmentId: enrolments.id, programmeCode: programmes.code })
    .from(assignments)
    .innerJoin(programmes, eq(programmes.id, assignments.programmeId))
    .innerJoin(
      enrolments,
      and(eq(enrolments.programmeId, assignments.programmeId), eq(enrolments.learnerId, learnerId)),
    )
    .where(
      and(
        eq(assignments.id, assignmentId),
        enrolmentId ? eq(enrolments.id, enrolmentId) : undefined,
      ),
    )
    .limit(1)
  // Not enrolled, or someone else's enrolment: the same "not found", so ids cannot be probed.
  if (!row) throw HttpError.notFound('Assignment not found')
  return row
}

export async function startUpload(learnerId: string, input: UploadStartInput) {
  const { assignment } = await ownedAssignment(learnerId, input.assignmentId)
  if (!assignment.allowsUpload) {
    throw HttpError.badRequest('This assignment takes a written response only.')
  }
  return storage.startUpload({
    ownerId: learnerId,
    assignmentId: assignment.id,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  })
}

/**
 * Submits a new version. Earlier versions are never edited or deleted (brief §6 version
 * history, §17 "never discard a learner's submission silently"): a revision is a new row.
 */
export async function submit(
  learnerId: string,
  learnerName: string,
  assignmentId: string,
  input: SubmitInput,
) {
  const { assignment, enrolmentId, programmeCode } = await ownedAssignment(
    learnerId,
    assignmentId,
    input.enrolmentId,
  )
  const versions = await versionsOf(assignment.id, enrolmentId)
  const latest = versions[0]?.submission
  if (latest && latest.status !== 'returned') {
    throw new HttpError(
      409,
      latest.status === 'approved' ? 'ALREADY_APPROVED' : 'AWAITING_REVIEW',
      latest.status === 'approved'
        ? 'This assignment is already approved. No further versions are needed.'
        : 'Your latest version is waiting for your trainer. You can revise it once it has been reviewed.',
    )
  }

  const text = input.responseText?.trim() || null
  const words = text ? countWords(text) : null
  if (input.uploadId && !assignment.allowsUpload) {
    throw HttpError.badRequest('This assignment takes a written response only.')
  }
  // With a file attached, any text is a covering note; without one, the word range applies.
  if (!input.uploadId) {
    const min = assignment.wordMin ?? 0
    const max = assignment.wordMax ?? Number.MAX_SAFE_INTEGER
    if (!text || (words ?? 0) < min || (words ?? 0) > max) {
      throw new HttpError(
        400,
        'WORD_COUNT',
        `Your response has ${words ?? 0} words. This task needs ${min} to ${max} words.`,
        { words, min, max },
      )
    }
  }
  const upload = input.uploadId ? await storage.readUpload(input.uploadId, learnerId) : null
  if (upload && upload.assignmentId !== assignment.id) throw HttpError.notFound('Upload not found')

  const markerTrainerId =
    latest?.markerTrainerId ?? (await chooseMarker(learnerId, assignment.programmeId))
  const submittedAt = now()
  const version = (latest?.version ?? 0) + 1

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(submissions)
      .values({
        assignmentId: assignment.id,
        enrolmentId,
        learnerId,
        version,
        status: 'submitted',
        responseText: text,
        wordCount: words,
        fileName: upload?.fileName ?? null,
        mimeType: upload?.mimeType ?? null,
        sizeBytes: upload?.sizeBytes ?? null,
        markerTrainerId,
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      })
      .returning()
    if (!row) throw new Error('Submission insert returned nothing')
    if (upload) {
      // Inside the transaction: if the file cannot be stored, the version is not created and
      // the learner sees an error with their text still in the editor.
      const storagePath = await storage.commitUpload(upload, row.id)
      await tx.update(submissions).set({ storagePath }).where(eq(submissions.id, row.id))
      row.storagePath = storagePath
    }
    await tx
      .update(enrolments)
      .set({ lastActivityAt: submittedAt })
      .where(eq(enrolments.id, enrolmentId))

    if (markerTrainerId) {
      const [marker] = await tx
        .select({ userId: trainerProfiles.userId })
        .from(trainerProfiles)
        .where(eq(trainerProfiles.id, markerTrainerId))
      if (marker) {
        await notify(
          {
            eventId: `evt-submitted-${row.id}`,
            kind: 'assignment_submitted',
            recipientIds: [marker.userId],
            subject: `New submission to mark: ${assignment.title}`,
            body: `${learnerName} submitted version ${version} of ${assignment.title}. Open Assignments in your trainer workspace to mark it.`,
            actorId: learnerId,
          },
          tx,
        )
      }
    }
    await recomputeEnrolment(learnerId, programmeCode, tx)
    return row
  })
  return created
}

/** A stored file, for the learner who owns it, the trainer who marks it, or an admin. */
export async function fileFor(scope: Scope, submissionId: string) {
  if (scope.kind === 'self') {
    const [own] = await db
      .select({ learnerId: submissions.learnerId })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
    if (!own || own.learnerId !== scope.userId) throw HttpError.notFound('Submission not found')
  } else {
    await assertSubmissionInScope(scope, submissionId)
  }
  const context = await submissionContext(submissionId)
  if (!context?.submission.fileName) throw HttpError.notFound('This version has no attached file')
  const full = await storage.storedFile(context.submission.storagePath)
  if (!full) {
    throw new HttpError(
      404,
      'FILE_NOT_STORED',
      'This is a seeded demo record: only the file details are stored, not the file itself.',
    )
  }
  return {
    path: full,
    fileName: context.submission.fileName,
    mimeType: context.submission.mimeType ?? 'application/octet-stream',
  }
}
