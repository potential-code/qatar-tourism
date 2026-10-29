import { UPLOAD_LIMITS } from '@shared/constants'
import { countWords, submitInput } from '@shared/schemas/assignment-marking'
import { z } from 'zod'
import {
  ApiError,
  assertSubmissionInScope,
  commit,
  currentScope,
  db,
  delay,
  insertRow,
  nowIso,
  out,
  parseInput,
  requireRole,
  updateRow,
} from './api'
import { learnerVersionView, rubricView } from './assignments/dto'
import {
  assignmentsForProgrammes,
  learnerEnrolments,
  markingEvents,
  submissionContext,
  versionsOf,
} from './assignments/queries'
import * as storage from './assignments/storage'
import { notify } from './notifications.service'
import { recomputeEnrolment } from './progress.service'

/**
 * Learner side of assignments (brief §5 step 6, §6), formerly server/modules/assignments:
 * read, upload, submit and resubmit, plus the authorised file read for previews and downloads.
 * Policy (assignments.policy): submit and upload are for learners on their own enrolments;
 * a stored file is for the owning learner, the assigned trainer or an admin.
 */

const OPEN_STATUSES: readonly string[] = ['submitted', 'under_review']

const LIMITS = {
  documentMb: UPLOAD_LIMITS.document.maxBytes / (1024 * 1024),
  videoMb: UPLOAD_LIMITS.video.maxBytes / (1024 * 1024),
}

const idParam = z.object({ id: z.uuid() })

/** The signed-in learner's assignments (A and B), each with every version, newest first. */
export async function listMine() {
  await delay()
  const viewer = requireRole('learner')
  const enrolments = learnerEnrolments(viewer.id).filter((e) => e.programmeCode !== 'C')
  const items = assignmentsForProgrammes(enrolments.map((e) => e.programmeId)).map((assignment) => {
    const enrolment = enrolments.find((e) => e.programmeId === assignment.programmeId)
    if (!enrolment) throw ApiError.notFound()
    const versions = versionsOf(assignment.id, enrolment.id)
    const events = markingEvents(versions.map((v) => v.submission.id))
    const latest = versions[0]?.submission
    const state = !latest
      ? 'not_started'
      : latest.status === 'submitted' || latest.status === 'under_review'
        ? 'awaiting_review'
        : latest.status
    return {
      assignment: {
        id: assignment.id,
        code: assignment.code,
        title: assignment.title,
        brief: assignment.brief,
        wordMin: assignment.wordMin,
        wordMax: assignment.wordMax,
        allowsUpload: assignment.allowsUpload,
        passPercent: assignment.passPercent,
        rubric: rubricView(assignment.code),
      },
      enrolment: {
        id: enrolment.id,
        programmeCode: enrolment.programmeCode,
        programmeTitle: enrolment.programmeTitle,
      },
      state,
      canSubmit: !latest || latest.status === 'returned',
      versions: versions.map((v) => learnerVersionView(v, events)),
    }
  })
  return out({ limits: LIMITS, items })
}

/** Who marks a first submission: the trainer the learner trained with, else the least busy. */
function chooseMarker(learnerId: string, programmeId: string): string | null {
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  const booked = db.rsvps
    .filter((r) => r.learnerId === learnerId && (r.status === 'confirmed' || r.status === 'moved'))
    .flatMap((r) => {
      const session = sessions.get(r.sessionId)
      return session && session.programmeId === programmeId && session.status !== 'cancelled'
        ? [session]
        : []
    })
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
  if (booked) return booked.trainerId

  const trainers = new Map(db.trainerProfiles.map((t) => [t.id, t]))
  const loads = db.trainerProgrammes
    .filter((tp) => tp.programmeId === programmeId && trainers.has(tp.trainerId))
    .map((tp) => ({
      trainerId: tp.trainerId,
      code: trainers.get(tp.trainerId)?.code ?? '',
      open: db.submissions.filter(
        (s) => s.markerTrainerId === tp.trainerId && OPEN_STATUSES.includes(s.status),
      ).length,
    }))
    .sort((a, b) => a.open - b.open || a.code.localeCompare(b.code))
  return loads[0]?.trainerId ?? null
}

/** The learner's own assignment. Not enrolled, or someone else's enrolment: the same 404. */
function ownedAssignment(learnerId: string, assignmentId: string, enrolmentId?: string) {
  const assignment = db.assignments.find((a) => a.id === assignmentId)
  const enrolment = assignment
    ? db.enrolments.find(
        (e) =>
          e.programmeId === assignment.programmeId &&
          e.learnerId === learnerId &&
          (!enrolmentId || e.id === enrolmentId),
      )
    : undefined
  const programme = db.programmes.find((p) => p.id === assignment?.programmeId)
  if (!assignment || !enrolment || !programme) throw ApiError.notFound('Assignment not found')
  return { assignment, enrolment, programmeCode: programme.code }
}

/**
 * Checks and stores a chosen file for an assignment, in one step. The Blob goes to the
 * browser's upload store; `uploadId` is then passed to `submit`.
 */
export async function uploadFile(assignmentId: string, file: Blob & { name: string }) {
  await delay()
  const viewer = requireRole('learner')
  parseInput(idParam, { id: assignmentId }, 'param')
  const { assignment } = ownedAssignment(viewer.id, assignmentId)
  if (!assignment.allowsUpload) {
    throw ApiError.badRequest('This assignment takes a written response only.')
  }
  const meta = await storage.storeUpload(viewer.id, assignment.id, file)
  return out({
    uploadId: meta.id,
    fileName: meta.fileName,
    sizeBytes: meta.sizeBytes,
    kind: meta.kind,
  })
}

/** Forgets an upload the learner removed before submitting. */
export async function discardUpload(uploadId: string) {
  await delay()
  const viewer = requireRole('learner')
  storage.readUpload(uploadId, viewer.id)
  storage.discardUpload(uploadId)
  return { discarded: true }
}

/**
 * Submits a new version. Earlier versions are never edited or deleted (brief §6 version
 * history, §17 "never discard a learner's submission silently"): a revision is a new row.
 */
export async function submit(assignmentId: string, input: unknown) {
  await delay()
  const viewer = requireRole('learner')
  parseInput(idParam, { id: assignmentId }, 'param')
  const body = parseInput(submitInput, input)
  const { assignment, enrolment, programmeCode } = ownedAssignment(
    viewer.id,
    assignmentId,
    body.enrolmentId,
  )
  const latest = versionsOf(assignment.id, enrolment.id)[0]?.submission
  if (latest && latest.status !== 'returned') {
    const approved = latest.status === 'approved'
    throw ApiError.conflict(
      approved ? 'ALREADY_APPROVED' : 'AWAITING_REVIEW',
      approved
        ? 'This assignment is already approved. No further versions are needed.'
        : 'Your latest version is waiting for your trainer. You can revise it once it has been reviewed.',
    )
  }

  const text = body.responseText?.trim() || null
  const words = text ? countWords(text) : null
  if (body.uploadId && !assignment.allowsUpload) {
    throw ApiError.badRequest('This assignment takes a written response only.')
  }
  // With a file attached, any text is a covering note; without one, the word range applies.
  if (!body.uploadId) {
    const min = assignment.wordMin ?? 0
    const max = assignment.wordMax ?? Number.MAX_SAFE_INTEGER
    if (!text || (words ?? 0) < min || (words ?? 0) > max) {
      throw new ApiError(
        400,
        'WORD_COUNT',
        `Your response has ${words ?? 0} words. This task needs ${min} to ${max} words.`,
        { words, min, max },
      )
    }
  }
  const upload = body.uploadId ? storage.readUpload(body.uploadId, viewer.id) : null
  if (upload && upload.assignmentId !== assignment.id) throw ApiError.notFound('Upload not found')

  const markerTrainerId = latest?.markerTrainerId ?? chooseMarker(viewer.id, assignment.programmeId)
  const submittedAt = nowIso()
  const version = (latest?.version ?? 0) + 1

  const row = insertRow('submissions', {
    assignmentId: assignment.id,
    enrolmentId: enrolment.id,
    learnerId: viewer.id,
    version,
    status: 'submitted',
    responseText: text,
    wordCount: words,
    fileName: upload?.fileName ?? null,
    mimeType: upload?.mimeType ?? null,
    sizeBytes: upload?.sizeBytes ?? null,
    storagePath: upload?.key ?? null,
    markerTrainerId,
    submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  })
  if (upload) storage.claimUpload(upload.id)
  updateRow(enrolment, { lastActivityAt: submittedAt })

  const marker = db.trainerProfiles.find((t) => t.id === markerTrainerId)
  if (marker) {
    notify({
      eventId: `evt-submitted-${row.id}`,
      kind: 'assignment_submitted',
      recipientIds: [marker.userId],
      subject: `New submission to mark: ${assignment.title}`,
      body: `${viewer.name} submitted version ${version} of ${assignment.title}. Open Assignments in your trainer workspace to mark it.`,
      actorId: viewer.id,
    })
  }
  recomputeEnrolment(viewer.id, programmeCode)
  commit()
  return out({ id: row.id, version: row.version, status: row.status, submittedAt })
}

/**
 * A stored file, for the learner who owns it, the trainer who marks it, or an admin. Returns
 * the Blob for an object URL (preview or download). Seeded records carry details only.
 */
export async function getSubmissionFile(submissionId: string) {
  await delay()
  requireRole('learner', 'trainer', 'admin')
  parseInput(idParam, { id: submissionId }, 'param')
  const scope = currentScope()
  if (scope.kind === 'self') {
    const own = db.submissions.find((s) => s.id === submissionId)
    if (!own || own.learnerId !== scope.userId) throw ApiError.notFound('Submission not found')
  } else {
    assertSubmissionInScope(scope, submissionId)
  }
  const context = submissionContext(submissionId)
  if (!context?.submission.fileName) throw ApiError.notFound('This version has no attached file')
  const blob = await storage.storedFile(context.submission.storagePath)
  if (!blob) {
    throw new ApiError(
      404,
      'FILE_NOT_STORED',
      'This is a seeded demo record: only the file details are stored, not the file itself.',
    )
  }
  // The Blob is immutable, so it is returned as is (no copy).
  return {
    blob,
    fileName: context.submission.fileName,
    mimeType: context.submission.mimeType ?? 'application/octet-stream',
  }
}

export type MyAssignments = Awaited<ReturnType<typeof listMine>>
export type SubmittedVersion = Awaited<ReturnType<typeof submit>>
export type SubmissionFile = Awaited<ReturnType<typeof getSubmissionFile>>
