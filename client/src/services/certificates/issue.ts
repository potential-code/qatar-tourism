import { THRESHOLDS } from '@shared/constants'
import { db, insertRow, nowIso } from '../api'
import { recordAudit } from '../audit.service'
import type { EnrolmentContext } from '../progress/evidence'
import { baselineAttempt, bestScore, type Evidence } from '../progress/rules'

/**
 * Issuing the watermarked demo certificate (formerly part of certificates.service.ts). Called by
 * `recomputeEnrolment` only after the rules say every Program A condition passes.
 */

export const CERTIFICATE_CODE_PREFIX = 'QTA-DEMO-A-'

/** Next demo certificate code, e.g. QTA-DEMO-A-000121. */
export function nextCertificateCode(): string {
  const last = db.certificates
    .filter((c) => c.code.startsWith(CERTIFICATE_CODE_PREFIX))
    .reduce((max, c) => Math.max(max, Number(c.code.slice(CERTIFICATE_CODE_PREFIX.length)) || 0), 0)
  return `${CERTIFICATE_CODE_PREFIX}${String(last + 1).padStart(6, '0')}`
}

/**
 * Issues the certificate when an eligible Program A enrolment has none (brief §6 "System checks
 * every required condition before issuing"). Audited as the system. Returns the active code, or
 * null when none was issued. A revoked certificate stays revoked: only an admin reissue may
 * replace it, never a later progress recompute.
 */
export function issueCertificateIfMissing(
  enrolment: EnrolmentContext,
  evidence: Evidence,
): string | null {
  if (enrolment.programme !== 'A' || !enrolment.certificationEnabled) return null
  const existing = db.certificates.filter((c) => c.enrolmentId === enrolment.id)
  const issued = existing.find((c) => c.status === 'issued')
  if (issued) return issued.code
  if (existing.length > 0) return null

  const profile = db.profiles.find((p) => p.userId === enrolment.learnerId)
  const account = db.users.find((u) => u.id === enrolment.learnerId)
  const code = nextCertificateCode()
  const evidenceSummary = {
    baselineScore: baselineAttempt(evidence.attempts)?.score ?? null,
    foundationQuizScore: bestScore(evidence.attempts, 'formative'),
    foundationQuizAtLeast: THRESHOLDS.foundationQuizPass,
    sessionScore: evidence.session.bestFinalScore,
    sessionScoreAtLeast: THRESHOLDS.sessionPass,
    assignmentScore:
      evidence.submissions
        .filter((s) => s.review?.status === 'approved')
        .map((s) => s.review?.score ?? 0)
        .sort((a, b) => b - a)[0] ?? null,
    assignmentScoreAtLeast: THRESHOLDS.assignmentPass,
    finalAssessmentScore: bestScore(evidence.attempts, 'post'),
    finalAssessmentAtLeast: THRESHOLDS.finalAssessmentPass,
    rolePlayAttempts: evidence.rolePlayCount,
    checkedBy: 'system',
  }
  insertRow('certificates', {
    code,
    enrolmentId: enrolment.id,
    learnerId: enrolment.learnerId,
    programmeId: enrolment.programmeId,
    learnerName: profile?.fullName ?? account?.name ?? 'Learner',
    status: 'issued',
    issuedAt: nowIso(),
    evidence: evidenceSummary,
  })
  recordAudit(null, {
    action: 'certificate.issue',
    objectType: 'certificate',
    objectId: code,
    before: null,
    after: { code, status: 'issued', enrolmentId: enrolment.id },
    reason: 'Every Program A requirement passed',
  })
  return code
}
