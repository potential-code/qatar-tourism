import { certificateReissueInput, certificateRevokeInput } from '@shared/schemas/certificate'
import { certificateCodeParam } from '@shared/schemas/learning-engine'
import type { CertificateRow } from '@shared/types/db'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  nowIso,
  out,
  parseInput,
  QATAR_TIMEZONE,
  requireRole,
  updateRow,
} from './api'
import { recordAudit } from './audit.service'
import { nextCertificateCode } from './certificates/issue'
import { renderCertificatePdf } from './certificates/pdf'
import { emitCertificationEvent } from './credentials/events'
import { lifecycleOf } from './credentials/lifecycle'
import { addCredentialCpdLine, newCredentialTerms } from './credentials/rules'

/**
 * Demo certificates (brief §6), formerly server/modules/certificates. Issuing happens in
 * `recomputeEnrolment` (certificates/issue.ts). Here: the learner's own list and detail, the
 * public verification record, the PDF (drawn in the browser), and admin revoke and reissue,
 * both audited. A learner only ever sees their own certificate.
 */

function toView(row: CertificateRow) {
  const programme = db.programmes.find((p) => p.id === row.programmeId)
  const enrolment = db.enrolments.find((e) => e.id === row.enrolmentId)
  return {
    code: row.code,
    learnerName: row.learnerName,
    programmeCode: programme?.code ?? 'A',
    programmeTitle: programme?.title ?? '',
    status: row.status,
    issuedAt: row.issuedAt,
    completedAt: enrolment?.completedAt ?? row.issuedAt,
    revokedAt: row.revokedAt,
    evidence: row.evidence,
    expiresAt: row.expiresAt,
    lifecycle: lifecycleOf(row),
    cpdHours: row.cpdHours,
  }
}

export type CertificateView = ReturnType<typeof toView>

/** The signed-in learner's certificates, newest first. Only Program A ever issues one. */
export async function listMine() {
  await delay()
  const learnerId = requireRole('learner').id
  const certified = new Set(db.programmes.filter((p) => p.certificationEnabled).map((p) => p.id))
  const items = db.certificates
    .filter(
      (c) =>
        c.learnerId === learnerId &&
        certified.has(c.programmeId) &&
        db.enrolments.some((e) => e.id === c.enrolmentId),
    )
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map(toView)
  return out({ items })
}

const findByCode = (code: string) => db.certificates.find((c) => c.code === code) ?? null

/** Owner or admin. Someone else's code answers "not found", so codes cannot be probed. */
function viewFor(code: string): CertificateView {
  const viewer = requireRole('learner', 'admin')
  parseInput(certificateCodeParam, { code }, 'param')
  const row = findByCode(code)
  if (!row || (viewer.role !== 'admin' && row.learnerId !== viewer.id)) {
    throw ApiError.notFound('Certificate not found')
  }
  return toView(row)
}

export async function getCertificate(code: string) {
  await delay()
  return out(viewFor(code))
}

/** Public verification (brief §6 "verifiable demo certificate record"): minimal fields only. */
export async function verify(code: string) {
  await delay()
  parseInput(certificateCodeParam, { code }, 'param')
  const row = findByCode(code)
  if (!row) return out({ found: false as const, code })
  const programme = db.programmes.find((p) => p.id === row.programmeId)
  return out({
    found: true as const,
    code: row.code,
    learnerName: row.learnerName,
    programmeTitle: programme?.title ?? '',
    status: row.status,
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt,
    expiresAt: row.expiresAt,
    lifecycle: lifecycleOf(row),
  })
}

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: QATAR_TIMEZONE,
  }).format(new Date(iso))

const LIFECYCLE_PDF_LABEL = {
  active: 'Active (demo record)',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  revoked: 'Revoked',
  superseded: 'Superseded',
} as const

/** The watermarked PDF for the owner or an admin, as a Blob ready to download. */
export async function certificatePdf(code: string) {
  await delay()
  const view = viewFor(code)
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const bytes = await renderCertificatePdf({
    learnerName: view.learnerName,
    programmeTitle: view.programmeTitle,
    code: view.code,
    completedOnLabel: dateLabel(view.completedAt),
    status: view.status,
    verifyUrl: `${origin}/certificates/verify/${view.code}`,
    expiresOnLabel: view.expiresAt ? dateLabel(view.expiresAt) : null,
    lifecycleLabel: LIFECYCLE_PDF_LABEL[view.lifecycle],
  })
  return {
    blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
    filename: `${view.code}.pdf`,
  }
}

// ---------------------------------------------------------------------------------------------
// Admin: revoke and reissue (brief §6: admin-only actions with audit records)
// ---------------------------------------------------------------------------------------------

export async function revoke(code: string, input: { reason: string }) {
  await delay()
  const viewer = requireRole('admin')
  parseInput(certificateCodeParam, { code }, 'param')
  const { reason } = parseInput(certificateRevokeInput, input)
  const row = findByCode(code)
  if (!row) throw ApiError.notFound('Certificate not found')
  if (row.status === 'revoked') throw ApiError.badRequest('This certificate is already revoked')
  updateRow(row, {
    status: 'revoked',
    revokedAt: nowIso(),
    revokedBy: viewer.id,
    revokeReason: reason,
  })
  recordAudit(viewer, {
    action: 'certificate.revoke',
    objectType: 'certificate',
    objectId: code,
    before: { status: 'issued' },
    after: { status: 'revoked' },
    reason,
  })
  emitCertificationEvent('revoked', row)
  commit()
  return out({ code, status: 'revoked' as const })
}

export async function reissue(code: string, input: { reason: string }) {
  await delay()
  const viewer = requireRole('admin')
  parseInput(certificateCodeParam, { code }, 'param')
  const { reason } = parseInput(certificateReissueInput, input)
  const row = findByCode(code)
  if (!row) throw ApiError.notFound('Certificate not found')
  if (row.status !== 'revoked') {
    throw ApiError.badRequest('Revoke the certificate before reissuing it')
  }
  const newCode = nextCertificateCode()
  const reissued = insertRow('certificates', {
    ...newCredentialTerms(),
    code: newCode,
    enrolmentId: row.enrolmentId,
    learnerId: row.learnerId,
    programmeId: row.programmeId,
    learnerName: row.learnerName,
    status: 'issued',
    issuedAt: nowIso(),
    issuedBy: viewer.id,
    reissuedFromId: row.id,
    evidence: row.evidence,
  })
  addCredentialCpdLine(reissued)
  recordAudit(viewer, {
    action: 'certificate.reissue',
    objectType: 'certificate',
    objectId: newCode,
    before: { code, status: 'revoked' },
    after: { code: newCode, status: 'issued' },
    reason,
  })
  commit()
  return out({ code: newCode, status: 'issued' as const })
}
