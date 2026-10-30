import type { Competency, CpdUnit } from '@shared/constants/enums'
import type { ExternalCertificateRow } from '@shared/types/db'
import { learnerDisplayId } from '@shared/utils/identity'
import { getUpload, putUpload } from '@/mocks/persist'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  newId,
  now,
  nowIso,
  out,
  requireCapability,
  requireRole,
  requireUser,
  updateRow,
} from './api'
import { audit } from './audit.service'
import {
  type ExternalDraft,
  fileContentError,
  validateEvidenceFile,
  validateExternalDraft,
} from './credentials/external-validation'
import {
  buildSampleEvidencePdf,
  SAMPLE_EVIDENCE_ID,
  SAMPLE_EVIDENCE_NAME,
} from './credentials/sample-evidence'
import { notify } from './notifications.service'

/**
 * External certificates (SPEC §7): a learner submits a certificate earned elsewhere. It stays
 * Pending review and adds no approved CPD until an admin recognises an amount. Reviews record
 * reviewer, time, evidence and recognised CPD; the same certificate can never be credited twice.
 * External evidence is always kept apart from Academy-issued credentials.
 */

const EVIDENCE_PREFIX = 'external-evidence/'

const sameCertificate = (
  a: ExternalCertificateRow,
  b: Pick<ExternalCertificateRow, 'learnerId' | 'issuer' | 'externalRef'>,
) =>
  a.learnerId === b.learnerId &&
  a.issuer.trim().toLowerCase() === b.issuer.trim().toLowerCase() &&
  a.externalRef.trim().toLowerCase() === b.externalRef.trim().toLowerCase()

function viewOf(row: ExternalCertificateRow) {
  const request = db.approvalRequests.find((r) => r.externalCertificateId === row.id)
  const reviewer = row.reviewerId ? db.users.find((u) => u.id === row.reviewerId) : null
  const profile = db.profiles.find((p) => p.userId === row.learnerId)
  return {
    id: row.id,
    requestCode: request?.code ?? null,
    learnerId: row.learnerId,
    learnerName: profile?.fullName ?? db.users.find((u) => u.id === row.learnerId)?.name ?? '',
    learnerDisplayId: profile ? learnerDisplayId(profile.learnerCode) : '',
    title: row.title,
    issuer: row.issuer,
    externalRef: row.externalRef,
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
    claimedAmount: row.claimedAmount,
    unit: row.unit,
    competency: row.competency,
    evidenceFileName: row.evidenceFileName,
    verificationUrl: row.verificationUrl,
    status: row.status,
    recognisedAmount: row.recognisedAmount,
    reviewerName: reviewer?.name ?? null,
    reviewedAt: row.reviewedAt,
    reason: row.reason,
    submittedAt: row.submittedAt,
    /** Another certificate of the same learner, issuer and reference was already recognised. */
    alreadyRecognised: db.externalCertificates.some(
      (o) => o.id !== row.id && o.status === 'verified' && sameCertificate(o, row),
    ),
  }
}

export type ExternalCertificateView = ReturnType<typeof viewOf>

const newestFirst = (a: ExternalCertificateRow, b: ExternalCertificateRow) =>
  b.submittedAt.localeCompare(a.submittedAt)

/** Synchronous views for one learner (used by the unified learner record). */
export const externalViews = (learnerId: string) =>
  db.externalCertificates
    .filter((c) => c.learnerId === learnerId)
    .sort(newestFirst)
    .map(viewOf)

export async function listMine() {
  await delay()
  const learner = requireRole('learner')
  return out({
    items: db.externalCertificates
      .filter((c) => c.learnerId === learner.id)
      .sort(newestFirst)
      .map(viewOf),
  })
}

export interface ExternalSubmission extends ExternalDraft {
  file: File | null
}

const today = () => now().toISOString().slice(0, 10)

function fail(field: string, code: string): never {
  throw ApiError.validation('Invalid request', {
    target: 'json',
    issues: [{ path: field, message: code }],
  })
}

/** Submits a certificate for review. Pending, with a pending (not approved) CPD line. */
export async function submit(input: ExternalSubmission) {
  await delay()
  const learner = requireRole('learner')
  const errors = validateExternalDraft(input, today())
  const fileError = validateEvidenceFile(input.file)
  if (fileError) errors.file = fileError
  else if (input.file) {
    const content = await fileContentError(input.file)
    if (content) errors.file = content
  }
  const draftRef = {
    learnerId: learner.id,
    issuer: input.issuer,
    externalRef: input.externalRef,
  }
  if (
    !errors.externalRef &&
    db.externalCertificates.some((c) => c.status !== 'rejected' && sameCertificate(c, draftRef))
  ) {
    errors.externalRef = 'duplicate'
  }
  const [field, code] = Object.entries(errors)[0] ?? []
  if (field && code) fail(field, code)

  const file = input.file as File
  const id = newId()
  const key = `${EVIDENCE_PREFIX}${id}/evidence.pdf`
  await putUpload(key, file)

  const row = insertRow('externalCertificates', {
    id,
    learnerId: learner.id,
    title: input.title.trim(),
    issuer: input.issuer.trim(),
    externalRef: input.externalRef.trim(),
    issuedOn: input.issuedOn,
    expiresOn: input.expiresOn || null,
    claimedAmount: Number(input.claimedAmount),
    unit: input.unit,
    competency: (input.competency || null) as Competency | null,
    evidenceFileId: key,
    evidenceFileName: file.name,
    verificationUrl: input.verificationUrl.trim() || null,
    status: 'pending',
    submittedAt: nowIso(),
  })
  const nextCode = db.approvalRequests.reduce(
    (max, r) => Math.max(max, Number(/^REQ-(\d+)$/.exec(r.code)?.[1] ?? 0)),
    0,
  )
  const request = insertRow('approvalRequests', {
    code: `REQ-${String(nextCode + 1).padStart(4, '0')}`,
    type: 'external_certificate',
    learnerId: learner.id,
    externalCertificateId: row.id,
    submittedAt: row.submittedAt,
    reviewerId: db.users.find((u) => u.role === 'admin')?.id ?? null,
    evidence: {
      note: `${row.title}, ${row.claimedAmount} ${row.unit} claimed`,
      fileName: file.name,
    },
    status: 'pending',
  })
  insertRow('cpdLedger', {
    learnerId: learner.id,
    source: 'external',
    hours: row.claimedAmount,
    unit: row.unit,
    status: 'pending',
    title: row.title,
    earnedOn: row.issuedOn,
    externalCertificateId: row.id,
  })
  audit({
    action: 'external_certificate.submit',
    objectType: 'external_certificate',
    objectId: request.code,
    after: { status: 'pending', claimed: `${row.claimedAmount} ${row.unit}` },
    reason: 'Learner submitted an external certificate for review',
  })
  notify({
    eventId: `external-submitted:${row.id}`,
    kind: 'external_certificate.submitted',
    recipientIds: [learner.id],
    subject: 'External certificate submitted',
    body: `${row.title} is pending review (${request.code}). It adds no approved CPD until it is reviewed.`,
  })
  commit()
  return out(viewOf(row))
}

/** The learner answers an information request; the certificate goes back to Pending review. */
export async function respondToInfoRequest(id: string, note: string) {
  await delay()
  const learner = requireRole('learner')
  const row = db.externalCertificates.find((c) => c.id === id && c.learnerId === learner.id)
  if (!row) throw ApiError.notFound('Certificate not found')
  if (row.status !== 'info_requested') {
    throw ApiError.badRequest('This certificate is not waiting for more information')
  }
  if (note.trim().length < 5) fail('note', 'required')
  updateRow(row, { status: 'pending', reason: null })
  const request = db.approvalRequests.find((r) => r.externalCertificateId === id)
  if (request) {
    updateRow(request, {
      status: 'pending',
      reason: null,
      evidence: { ...request.evidence, note: note.trim() },
    })
  }
  audit({
    action: 'external_certificate.respond',
    objectType: 'external_certificate',
    objectId: request?.code ?? id,
    after: { status: 'pending' },
    reason: 'Learner provided the requested information',
  })
  commit()
  return out(viewOf(row))
}

// --- Evidence -------------------------------------------------------------------------------

/** A harmless sample PDF as a File, so the form can be demonstrated without a document at hand. */
export async function sampleEvidenceFile(): Promise<File> {
  const blob = await buildSampleEvidencePdf()
  return new File([blob], SAMPLE_EVIDENCE_NAME, { type: 'application/pdf' })
}

/** The evidence file: its owner or a reviewer. Seeded records open the generated sample. */
export async function evidenceFile(id: string) {
  await delay()
  const user = requireUser()
  const row = db.externalCertificates.find((c) => c.id === id)
  if (!row) throw ApiError.notFound('Certificate not found')
  if (row.learnerId !== user.id) requireCapability('approval.review')
  const stored =
    row.evidenceFileId && row.evidenceFileId !== SAMPLE_EVIDENCE_ID
      ? await getUpload(row.evidenceFileId)
      : null
  const blob = stored ?? (await buildSampleEvidencePdf(row.title))
  return { blob, filename: row.evidenceFileName ?? SAMPLE_EVIDENCE_NAME }
}

// --- Admin review ---------------------------------------------------------------------------

export interface ExternalFilter {
  status?: ExternalCertificateRow['status'] | 'all'
}

export async function listForReview(filter: ExternalFilter = {}) {
  await delay()
  requireCapability('approval.review')
  const items = db.externalCertificates
    .filter((c) => !filter.status || filter.status === 'all' || c.status === filter.status)
    .sort(newestFirst)
    .map(viewOf)
  return out({ items })
}

export type ReviewDecision =
  | { action: 'approve'; recognisedAmount: number }
  | { action: 'reject'; reason: string }
  | { action: 'request_info'; reason: string }

/**
 * Approve (with the recognised amount), reject (with a reason) or ask for information. Only a
 * Pending certificate can be decided, so a double click or a replay credits nothing twice.
 */
export async function review(id: string, decision: ReviewDecision) {
  await delay()
  const reviewer = requireCapability('approval.review')
  const row = db.externalCertificates.find((c) => c.id === id)
  if (!row) throw ApiError.notFound('Certificate not found')
  if (row.status !== 'pending') {
    throw ApiError.badRequest('This certificate has already been decided')
  }
  const request = db.approvalRequests.find((r) => r.externalCertificateId === id)
  const decidedAt = nowIso()
  let status: ExternalCertificateRow['status']
  let reason: string | null = null
  let recognised: number | null = null

  if (decision.action === 'approve') {
    recognised = Number(decision.recognisedAmount)
    if (!Number.isFinite(recognised) || recognised <= 0 || recognised > row.claimedAmount) {
      throw ApiError.badRequest(
        `The recognised amount must be above zero and no more than the ${row.claimedAmount} ${row.unit} claimed`,
      )
    }
    const earlier = db.externalCertificates.find(
      (o) => o.id !== row.id && o.status === 'verified' && sameCertificate(o, row),
    )
    if (earlier) {
      throw ApiError.badRequest(
        `Credit for this certificate was already recognised (${earlier.title}, ${earlier.recognisedAmount} ${earlier.unit}). It cannot be credited twice.`,
      )
    }
    status = 'verified'
  } else {
    reason = decision.reason.trim()
    if (reason.length < 5) throw ApiError.badRequest('Give a reason of at least 5 characters')
    status = decision.action === 'reject' ? 'rejected' : 'info_requested'
  }

  const before = { status: row.status }
  updateRow(row, {
    status,
    reason,
    recognisedAmount: recognised,
    reviewerId: reviewer.id,
    reviewedAt: decidedAt,
  })

  const approvalStatus =
    status === 'verified' ? 'approved' : status === 'rejected' ? 'rejected' : 'info_requested'
  const requestPatch = {
    status: approvalStatus,
    reason,
    reviewerId: reviewer.id,
    ...(status === 'info_requested' ? {} : { decidedAt, decidedBy: reviewer.id }),
  } as const
  const requestRow =
    request ??
    insertRow('approvalRequests', {
      code: `REQ-${String(
        db.approvalRequests.reduce(
          (max, r) => Math.max(max, Number(/^REQ-(\d+)$/.exec(r.code)?.[1] ?? 0)),
          0,
        ) + 1,
      ).padStart(4, '0')}`,
      type: 'external_certificate',
      learnerId: row.learnerId,
      externalCertificateId: row.id,
      submittedAt: row.submittedAt,
      evidence: { note: row.title, fileName: row.evidenceFileName },
    })
  updateRow(requestRow, requestPatch)

  // The ledger: one line per external certificate, so a repeat can never add a second credit.
  const line = db.cpdLedger.find((l) => l.externalCertificateId === row.id)
  if (status === 'verified' && recognised !== null) {
    const patch = { status: 'approved' as const, hours: recognised, unit: row.unit as CpdUnit }
    if (line) updateRow(line, patch)
    else {
      insertRow('cpdLedger', {
        learnerId: row.learnerId,
        source: 'external',
        title: row.title,
        earnedOn: row.issuedOn,
        externalCertificateId: row.id,
        ...patch,
      })
    }
  } else if (status === 'rejected' && line) {
    updateRow(line, { status: 'rejected' })
  }

  const subject =
    status === 'verified'
      ? `External certificate approved: ${recognised} ${row.unit} CPD recognised`
      : status === 'rejected'
        ? 'External certificate not approved'
        : 'More information needed for your external certificate'
  audit({
    action: `external_certificate.${decision.action}`,
    objectType: 'external_certificate',
    objectId: requestRow.code,
    before,
    after: {
      status,
      recognisedAmount: recognised,
      reviewedAt: decidedAt,
      evidence: row.evidenceFileName,
    },
    reason: reason ?? `Evidence checked; ${recognised} ${row.unit} recognised`,
  })
  notify({
    eventId: `external-${decision.action}:${row.id}:${decidedAt}`,
    kind: 'external_certificate.reviewed',
    recipientIds: [row.learnerId],
    subject,
    body: reason ? `${row.title}: ${reason}` : `${row.title} is now counted in your CPD ledger.`,
  })
  commit()
  return out(viewOf(row))
}
