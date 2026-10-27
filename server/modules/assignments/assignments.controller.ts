import type { Viewer } from '@server/middleware/auth.middleware'
import type { Scope } from '@server/middleware/scope.middleware'
import { UPLOAD_LIMITS } from '@shared/constants'
import type {
  MarkingCorrectionInput,
  MarkingDraftInput,
  MarkingFinalInput,
  MarkingQueueQuery,
  SubmitInput,
  UploadStartInput,
} from '@shared/schemas/assignment-marking'
import {
  draftView,
  learnerIdentity,
  learnerVersionView,
  markerVersionView,
  rubricView,
  waiting,
} from './assignments.dto'
import * as marking from './assignments.marking.service'
import * as assignmentsService from './assignments.service'
import * as storage from './assignments.storage'

export function ping() {
  return { module: 'assignments' as const, status: 'ok' as const }
}

const LIMITS = {
  documentMb: UPLOAD_LIMITS.document.maxBytes / (1024 * 1024),
  videoMb: UPLOAD_LIMITS.video.maxBytes / (1024 * 1024),
}

// --- Learner -------------------------------------------------------------------------------

export async function listMine(viewer: Viewer) {
  const rows = await assignmentsService.listForLearner(viewer.id)
  return {
    limits: LIMITS,
    items: rows.map(({ assignment, enrolment, versions, events }) => {
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
    }),
  }
}

export async function startUpload(viewer: Viewer, input: UploadStartInput) {
  const meta = await assignmentsService.startUpload(viewer.id, input)
  return { uploadId: meta.id, fileName: meta.fileName, sizeBytes: meta.sizeBytes, kind: meta.kind }
}

export async function appendChunk(
  viewer: Viewer,
  uploadId: string,
  offset: number,
  chunk: Uint8Array,
) {
  return storage.appendChunk(uploadId, viewer.id, offset, chunk)
}

export async function discardUpload(viewer: Viewer, uploadId: string) {
  await storage.readUpload(uploadId, viewer.id)
  await storage.discardUpload(uploadId)
  return { discarded: true }
}

export async function submit(viewer: Viewer, assignmentId: string, input: SubmitInput) {
  const row = await assignmentsService.submit(viewer.id, viewer.name, assignmentId, input)
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
  }
}

export async function file(scope: Scope, submissionId: string) {
  return assignmentsService.fileFor(scope, submissionId)
}

// --- Marking -------------------------------------------------------------------------------

export async function queue(viewer: Viewer, scope: Scope, query: MarkingQueueQuery) {
  const { items, total, statusCounts, overdue, draftedIds } = await marking.queue(scope, query)
  const countOf = (statuses: string[]) =>
    statusCounts.filter((s) => statuses.includes(s.status)).reduce((sum, s) => sum + s.total, 0)
  return {
    total,
    page: query.page,
    pageSize: query.pageSize,
    counts: {
      open: countOf(['submitted', 'under_review']),
      returned: countOf(['returned']),
      approved: countOf(['approved']),
      all: countOf(['submitted', 'under_review', 'returned', 'approved']),
      overdue,
    },
    items: items.map((row) => {
      const open = row.submission.status === 'submitted' || row.submission.status === 'under_review'
      return {
        id: row.submission.id,
        learner: learnerIdentity(viewer.role, row.learnerCode, row.learnerName),
        programmeCode: row.programmeCode,
        assignmentCode: row.assignmentCode,
        assignmentTitle: row.assignmentTitle,
        version: row.submission.version,
        status: row.submission.status,
        format: row.submission.fileName
          ? row.submission.mimeType === 'video/mp4'
            ? ('video' as const)
            : ('document' as const)
          : ('text' as const),
        submittedAt: row.submission.submittedAt.toISOString(),
        ...waiting(row.submission.submittedAt, open),
        hasDraft: open && draftedIds.has(row.submission.id),
        score: row.review?.rubricScore ?? null,
      }
    }),
  }
}

export async function detail(viewer: Viewer, scope: Scope, submissionId: string) {
  const { context, versions, events, draft, markerName, isLatest } = await marking.detail(
    scope,
    submissionId,
  )
  const current = versions.find((v) => v.submission.id === submissionId)
  const open =
    context.submission.status === 'submitted' || context.submission.status === 'under_review'
  return {
    id: context.submission.id,
    learner: learnerIdentity(viewer.role, context.learnerCode, context.learnerName),
    programme: { code: context.programmeCode, title: context.programmeTitle },
    assignment: {
      code: context.assignment.code,
      title: context.assignment.title,
      brief: context.assignment.brief,
      wordMin: context.assignment.wordMin,
      wordMax: context.assignment.wordMax,
      passPercent: context.assignment.passPercent,
      rubric: rubricView(context.assignment.code),
    },
    markerName,
    isLatest,
    ...waiting(context.submission.submittedAt, open),
    current: current ? markerVersionView(current, events) : null,
    draft: current?.review ? null : draftView(draft),
    versions: versions.map((v) => markerVersionView(v, events)),
  }
}

export async function saveDraft(
  actor: marking.MarkingActor,
  scope: Scope,
  id: string,
  input: MarkingDraftInput,
) {
  const result = await marking.saveDraft(actor, scope, id, input)
  return { savedAt: result.savedAt.toISOString(), total: result.total }
}

export async function finalise(
  actor: marking.MarkingActor,
  scope: Scope,
  id: string,
  input: MarkingFinalInput,
) {
  const result = await marking.finalise(actor, scope, id, input)
  return { status: result.status, total: result.total, unchanged: result.unchanged }
}

export async function correct(
  actor: marking.MarkingActor,
  scope: Scope,
  id: string,
  input: MarkingCorrectionInput,
) {
  return marking.correct(actor, scope, id, input)
}
