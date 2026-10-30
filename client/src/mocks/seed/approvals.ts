import type { Cast } from './cast'
import { stableUuid, userIds } from './ids'
import type { Calendar } from './reference-date'
import type { SeedRow } from './rows'

type ApprovalInsert = SeedRow<'approvalRequests'>
type AuditInsert = SeedRow<'auditEvents'>

export type ApprovalsResult = {
  approvalRequests: ApprovalInsert[]
  audit: AuditInsert[]
}

/**
 * Approval requests (SPEC §5): three pending and one rejected programme-enrolment request (all
 * for Program A), and two pending external-certificate requests (Mariam's and one more).
 * Decided external certificates (verified, rejected) have no request row: list them from the
 * `externalCertificates` table. One enrolment request names the full session SES-T03-2, so the
 * "approval does not bypass capacity" rule can be shown.
 */
export function buildApprovals(
  cal: Calendar,
  cast: Cast,
  programmeA: string,
  external: { mariam: string; pending: string },
): ApprovalsResult {
  const rows: ApprovalInsert[] = []
  const audit: AuditInsert[] = []
  let n = 0
  const add = (fields: Omit<ApprovalInsert, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => {
    n += 1
    const code = `REQ-${String(n).padStart(4, '0')}`
    const submittedAt = fields.submittedAt as Date
    rows.push({
      id: stableUuid('approval', code),
      code,
      createdAt: submittedAt,
      updatedAt: (fields.decidedAt as Date | null | undefined) ?? submittedAt,
      ...fields,
    })
    return code
  }

  add({
    type: 'external_certificate',
    learnerId: cast.mariam.userId,
    externalCertificateId: external.mariam,
    submittedAt: cal.ago(1.2),
    reviewerId: userIds.admin,
    evidence: {
      note: 'Guest Service Excellence, 1.5 CPD hours claimed',
      fileName: 'sample-certificate-evidence.pdf',
    },
  })
  add({
    type: 'external_certificate',
    learnerId: cast.extPending.userId,
    externalCertificateId: external.pending,
    submittedAt: cal.ago(2.4),
    reviewerId: userIds.admin,
    evidence: {
      note: 'First Aid for Tourism Venues, 3 CPD hours claimed',
      fileName: 'sample-certificate-evidence.pdf',
    },
  })
  cast.enrolPending.forEach((learner, index) => {
    add({
      type: 'enrolment',
      learnerId: learner.userId,
      programmeId: programmeA,
      // The first request is for the full session, to show approval never bypasses capacity.
      sessionId: index === 0 ? stableUuid('session', 'SES-T03-2') : null,
      submittedAt: cal.ago(0.6 + index * 0.9),
      reviewerId: userIds.admin,
      evidence: {
        note: 'Line manager confirmed the nomination (demonstration note)',
        fileName: null,
      },
    })
  })
  const rejectedAt = cal.ago(3)
  const rejectedCode = add({
    type: 'enrolment',
    learnerId: cast.enrolRejected.userId,
    programmeId: programmeA,
    submittedAt: cal.ago(5),
    reviewerId: userIds.admin,
    evidence: { note: 'Self-nominated; no manager confirmation', fileName: null },
    status: 'rejected',
    reason:
      'A manager confirmation is required. Ask your manager to confirm the nomination, then submit a new request.',
    decidedAt: rejectedAt,
    decidedBy: userIds.admin,
  })
  audit.push({
    id: stableUuid('audit', `approval:${rejectedCode}`),
    actorId: userIds.admin,
    actorRole: 'admin',
    actorLabel: 'Academy Admin',
    action: 'approval.reject',
    objectType: 'approval_request',
    objectId: rejectedCode,
    before: { status: 'pending' },
    after: { status: 'rejected' },
    reason: 'A manager confirmation is required.',
    outcome: 'allowed',
    createdAt: rejectedAt,
  })
  return { approvalRequests: rows, audit }
}
