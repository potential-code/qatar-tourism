import { addMonths } from '@shared/utils/credentials'
import type { ActivityResult } from './activity'
import type { Cast } from './cast'
import { stableUuid, userIds } from './ids'
import type { EnrolmentPlan } from './plan'
import type { Calendar } from './reference-date'
import type { SeedRow } from './rows'
import { CPD_HOURS_PER_CREDENTIAL, DEFAULT_DEMO_SETTINGS } from './settings'

type CertificateInsert = SeedRow<'certificates'>
type CpdInsert = SeedRow<'cpdLedger'>
type ExternalInsert = SeedRow<'externalCertificates'>
type LicenceInsert = SeedRow<'licenceStatus'>
type AuditInsert = SeedRow<'auditEvents'>

export type CredentialsResult = {
  /** The original certificates (patched with expiry and CPD) plus the prior-cycle extras. */
  certificates: CertificateInsert[]
  cpdLedger: CpdInsert[]
  externalCertificates: ExternalInsert[]
  licenceStatus: LicenceInsert[]
  audit: AuditInsert[]
  /** Ids other lanes and tests need: external certificate id per cast member. */
  ids: { externalMariam: string; externalPending: string }
}

const DAY = 86_400_000
/** Shown as the evidence of every seeded external certificate: a harmless sample, not a real file. */
export const SAMPLE_EVIDENCE = {
  id: 'sample-evidence-demo-1',
  name: 'sample-certificate-evidence.pdf',
}

/**
 * Credentials, CPD, external evidence and licence status (SPEC §7).
 *
 * The 120 existing Program A certificates keep their rows and gain a 12-month expiry. Four prior
 * cycle credentials are added on the holders' own Program A enrolments (a re-certification
 * cycle: renewal uses the same enrolment), each marked `evidence.priorCycle`:
 *   - Mariam (LRN-0042): expires 25 days after the reference date ("Renewal due").
 *   - `expired`: expired 40 days before the reference date.
 *   - `renewed`: the old credential is superseded by the holder's current certificate.
 *   - `revoked`: revoked 30 days before the reference date.
 */
export function buildCredentials(
  cal: Calendar,
  activity: ActivityResult,
  cast: Cast,
  programmeA: string,
): CredentialsResult {
  const validity = DEFAULT_DEMO_SETTINGS.credentialValidityMonths
  const audit: AuditInsert[] = []
  const certificates = activity.certificates

  // Current cycle: every existing certificate gains its validity window and CPD value.
  for (const cert of certificates) {
    const issuedAt = cert.issuedAt as Date
    cert.expiresAt = addMonths(issuedAt, validity)
    cert.cpdHours = CPD_HOURS_PER_CREDENTIAL
    cert.ruleVersion = 'A-cert-v1'
  }

  const priorCode = (n: number) => `QTA-DEMO-A-P25-${String(n).padStart(4, '0')}`
  const prior = (
    n: number,
    enrolment: EnrolmentPlan,
    expiresAt: Date,
    extra: Partial<CertificateInsert> = {},
  ): CertificateInsert => {
    const issuedAt = addMonths(expiresAt, -validity)
    const code = priorCode(n)
    const row: CertificateInsert = {
      id: stableUuid('certificate', code),
      code,
      enrolmentId: enrolment.id,
      learnerId: enrolment.learner.userId,
      programmeId: programmeA,
      learnerName: enrolment.learner.fullName,
      status: 'issued',
      issuedAt,
      issuedBy: null,
      expiresAt,
      cpdHours: CPD_HOURS_PER_CREDENTIAL,
      ruleVersion: 'A-cert-v1',
      evidence: { priorCycle: '2025', checkedBy: 'system' },
      createdAt: issuedAt,
      updatedAt: issuedAt,
      ...extra,
    }
    audit.push({
      id: stableUuid('audit', `cert:${code}`),
      actorId: null,
      actorRole: 'system',
      actorLabel: 'Certification check',
      action: 'certificate.issue',
      objectType: 'certificate',
      objectId: code,
      before: null,
      after: { code, status: 'issued', expiresAt: expiresAt.toISOString() },
      reason: 'All Program A conditions verified (prior cycle)',
      outcome: 'allowed',
      createdAt: issuedAt,
    })
    return row
  }

  // 1. Mariam: 25 days to expiry.
  const mariamCert = prior(1, cast.mariamA, cal.at(25, '08:00'))
  // 2. Expired 40 days ago.
  const expiredCert = prior(2, cast.expired, cal.at(-40, '10:00'))
  // 3. Renewed: the old credential expired a week after the current one was issued, capped
  //    yesterday; the current certificate points back at it.
  const renewal = certificates.find((c) => c.enrolmentId === cast.renewed.id)
  if (!renewal) throw new Error('Seed cast: renewal holder has no certificate')
  const oldExpiry = new Date(
    Math.min((renewal.issuedAt as Date).getTime() + 7 * DAY, cal.at(-1, '10:00').getTime()),
  )
  const supersededCert = prior(3, cast.renewed, oldExpiry)
  renewal.supersedesId = supersededCert.id as string
  audit.push({
    id: stableUuid('audit', `cert-renew:${renewal.code}`),
    actorId: null,
    actorRole: 'system',
    actorLabel: 'Certification check',
    action: 'certificate.renew',
    objectType: 'certificate',
    objectId: renewal.code as string,
    before: { supersedes: supersededCert.code },
    after: { code: renewal.code, supersedes: supersededCert.code },
    reason: 'Renewal checklist complete; the earlier credential is kept as superseded',
    outcome: 'allowed',
    createdAt: renewal.issuedAt as Date,
  })
  // 4. Revoked 30 days ago.
  const revokedAt = cal.at(-30, '11:00')
  const revokedCert = prior(4, cast.revoked, cal.at(140, '10:00'), {
    status: 'revoked',
    revokedAt,
    revokedBy: userIds.admin,
    revokeReason: 'Issued before an assessment-integrity review; withdrawn (demonstration record)',
  })
  audit.push({
    id: stableUuid('audit', `cert-revoke:${revokedCert.code}`),
    actorId: userIds.admin,
    actorRole: 'admin',
    actorLabel: 'Academy Admin',
    action: 'certificate.revoke',
    objectType: 'certificate',
    objectId: revokedCert.code as string,
    before: { status: 'issued' },
    after: { status: 'revoked' },
    reason: revokedCert.revokeReason as string,
    outcome: 'allowed',
    createdAt: revokedAt,
  })
  const extras = [mariamCert, expiredCert, supersededCert, revokedCert]

  // --- External certificates --------------------------------------------------------------
  const ext = (
    key: string,
    learner: { userId: string },
    fields: Partial<ExternalInsert> & Pick<ExternalInsert, 'title' | 'issuer' | 'externalRef'>,
    submittedAgo: number,
  ): ExternalInsert => {
    const submittedAt = cal.ago(submittedAgo)
    return {
      id: stableUuid('external-certificate', key),
      learnerId: learner.userId,
      issuedOn: cal.date(-60),
      expiresOn: cal.date(670),
      claimedAmount: 2,
      unit: 'hours',
      competency: null,
      evidenceFileId: SAMPLE_EVIDENCE.id,
      evidenceFileName: SAMPLE_EVIDENCE.name,
      verificationUrl: null,
      status: 'pending',
      recognisedAmount: null,
      reviewerId: null,
      reviewedAt: null,
      reason: null,
      submittedAt,
      createdAt: submittedAt,
      updatedAt: submittedAt,
      ...fields,
    }
  }
  const extMariam = ext(
    'mariam',
    cast.mariam,
    {
      title: 'Guest Service Excellence (illustrative external course)',
      issuer: 'Demo Hospitality Institute',
      externalRef: 'DHI-GSE-2025-0042',
      claimedAmount: 1.5,
      competency: 'communicate_clearly',
      verificationUrl: 'https://example.com/verify/DHI-GSE-2025-0042',
    },
    1.2,
  )
  const extPending = ext(
    'pending',
    cast.extPending,
    {
      title: 'First Aid for Tourism Venues (illustrative external course)',
      issuer: 'Demo Safety Council',
      externalRef: 'DSC-FA-7731',
      claimedAmount: 3,
      competency: 'protect_information',
    },
    2.4,
  )
  const reviewedVerified = cal.ago(6)
  const extVerified = ext(
    'verified',
    cast.extVerified,
    {
      title: 'Cultural Heritage Interpretation (illustrative external course)',
      issuer: 'Demo Heritage Academy',
      externalRef: 'DHA-CHI-2025-118',
      claimedAmount: 4,
      competency: 'communicate_clearly',
      verificationUrl: 'https://example.com/verify/DHA-CHI-2025-118',
      status: 'verified',
      recognisedAmount: 3,
      reviewerId: userIds.admin,
      reviewedAt: reviewedVerified,
      reason: 'Recognised 3 of 4 hours: one hour repeats Academy content.',
    },
    9,
  )
  const reviewedRejected = cal.ago(4)
  const extRejected = ext(
    'rejected',
    cast.extRejected,
    {
      title: 'Customer Care Basics (illustrative external course)',
      issuer: 'Demo Skills Provider',
      externalRef: 'DSP-CCB-0099',
      claimedAmount: 2,
      competency: 'recover_service',
      status: 'rejected',
      reviewerId: userIds.admin,
      reviewedAt: reviewedRejected,
      reason: 'The reference could not be matched to the evidence. Resubmit a clear copy.',
    },
    8,
  )
  const externalCertificates = [extMariam, extPending, extVerified, extRejected]

  for (const [row, action] of [
    [extVerified, 'external_certificate.approve'],
    [extRejected, 'external_certificate.reject'],
  ] as const) {
    audit.push({
      id: stableUuid('audit', `${action}:${row.id}`),
      actorId: userIds.admin,
      actorRole: 'admin',
      actorLabel: 'Academy Admin',
      action,
      objectType: 'external_certificate',
      objectId: row.id as string,
      before: { status: 'pending' },
      after: { status: row.status, recognisedAmount: row.recognisedAmount },
      reason: row.reason as string,
      outcome: 'allowed',
      createdAt: row.reviewedAt as Date,
    })
  }

  // --- CPD ledger -------------------------------------------------------------------------
  const cpdLedger: CpdInsert[] = []
  const unrevoked = [...certificates, mariamCert, expiredCert, supersededCert]
  for (const cert of unrevoked) {
    cpdLedger.push({
      id: stableUuid('cpd', `cert:${cert.code}`),
      learnerId: cert.learnerId,
      source: 'academy',
      hours: CPD_HOURS_PER_CREDENTIAL,
      unit: 'hours',
      status: 'earned',
      title: 'Program A certificate',
      earnedOn: (cert.issuedAt as Date).toISOString().slice(0, 10),
      certificateId: cert.id,
      createdAt: cert.issuedAt as Date,
      updatedAt: cert.issuedAt as Date,
    })
  }
  // Mariam's cycle: the credential above (4 h) plus a workshop (2 h) earned, 1.5 h pending review.
  const workshopAt = cal.ago(120)
  cpdLedger.push({
    id: stableUuid('cpd', 'mariam:workshop'),
    learnerId: cast.mariam.userId,
    source: 'academy',
    hours: 2,
    unit: 'hours',
    status: 'earned',
    title: 'Understanding visitor needs workshop',
    earnedOn: workshopAt.toISOString().slice(0, 10),
    createdAt: workshopAt,
    updatedAt: workshopAt,
  })
  for (const row of externalCertificates) {
    const status = row.status === 'verified' ? 'approved' : (row.status as 'pending' | 'rejected')
    const hours =
      row.status === 'verified' ? (row.recognisedAmount as number) : (row.claimedAmount as number)
    cpdLedger.push({
      id: stableUuid('cpd', `external:${row.id}`),
      learnerId: row.learnerId,
      source: 'external',
      hours,
      unit: 'hours',
      status,
      title: row.title,
      earnedOn: row.issuedOn as string,
      externalCertificateId: row.id,
      createdAt: row.submittedAt as Date,
      updatedAt: (row.reviewedAt as Date | null | undefined) ?? (row.submittedAt as Date),
    })
  }

  // --- Licence status (CRM is the authority; no row means "not tracked") --------------------
  const licence = (
    learner: { userId: string },
    status: LicenceInsert['status'],
    updatedAgo: number,
    pendingRequest: LicenceInsert['pendingRequest'] = null,
  ): LicenceInsert => {
    const at = cal.ago(updatedAgo)
    return {
      id: stableUuid('licence', learner.userId),
      learnerId: learner.userId,
      status,
      source: 'crm',
      pendingRequest,
      createdAt: at,
      updatedAt: at,
    }
  }
  const licenceStatus = [
    licence(cast.mariam, 'active', 30),
    licence(cast.renewed.learner, 'active', 20),
    licence(cast.expired.learner, 'expired', 45),
    licence(cast.revoked.learner, 'suspended', 28),
    licence(cast.extPending, 'pending', 3, {
      requestedStatus: 'active',
      requestedAt: cal.ago(2).toISOString(),
      reason: 'Learner asked the Academy to request a licence review (demonstration).',
    }),
  ]

  return {
    certificates: [...certificates, ...extras],
    cpdLedger,
    externalCertificates,
    licenceStatus,
    audit,
    ids: { externalMariam: extMariam.id as string, externalPending: extPending.id as string },
  }
}
