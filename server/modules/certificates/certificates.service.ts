import { env } from '@server/config/env'
import { db } from '@server/db/connection'
import { certificates, enrolments, profiles, programmes, user } from '@server/db/schema'
import { now, QATAR_TIMEZONE } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import { recordAudit } from '@server/modules/audit/audit.service'
import type { EnrolmentContext } from '@server/modules/progress/progress.evidence'
import { baselineAttempt, bestScore, type Evidence } from '@server/modules/progress/progress.rules'
import { THRESHOLDS } from '@shared/constants'
import { and, desc, eq, like } from 'drizzle-orm'
import { renderCertificatePdf } from './certificate-pdf'

type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>

const CODE_PREFIX = 'QTA-DEMO-A-'

/** Next demo certificate code, e.g. QTA-DEMO-A-000121. */
async function nextCode(run: Executor): Promise<string> {
  const [latest] = await run
    .select({ code: certificates.code })
    .from(certificates)
    .where(like(certificates.code, `${CODE_PREFIX}%`))
    .orderBy(desc(certificates.code))
    .limit(1)
  const last = latest ? Number(latest.code.slice(CODE_PREFIX.length)) : 0
  return `${CODE_PREFIX}${String(last + 1).padStart(6, '0')}`
}

/**
 * Issues the watermarked demo certificate when an eligible Program A enrolment has none
 * (brief §6 "System checks every required condition before issuing"). Called by
 * `recomputeEnrolment` only after the rules say every condition passes. Audited.
 */
export async function issueCertificateIfMissing(
  run: Executor,
  enrolment: EnrolmentContext,
  evidence: Evidence,
): Promise<string | null> {
  if (enrolment.programme !== 'A' || !enrolment.certificationEnabled) return null
  const [existing] = await run
    .select({ code: certificates.code })
    .from(certificates)
    .where(and(eq(certificates.enrolmentId, enrolment.id), eq(certificates.status, 'issued')))
    .limit(1)
  if (existing) return existing.code

  const [name] = await run
    .select({ fullName: profiles.fullName, userName: user.name })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, enrolment.learnerId))
    .limit(1)

  const code = await nextCode(run)
  const issuedAt = now()
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
  const inserted = await run
    .insert(certificates)
    .values({
      code,
      enrolmentId: enrolment.id,
      learnerId: enrolment.learnerId,
      programmeId: enrolment.programmeId,
      learnerName: name?.fullName ?? name?.userName ?? 'Learner',
      status: 'issued',
      issuedAt,
      evidence: evidenceSummary,
    })
    .onConflictDoNothing()
    .returning({ id: certificates.id })
  if (inserted.length === 0) return null

  await recordAudit(
    null,
    {
      action: 'certificate.issue',
      objectType: 'certificate',
      objectId: code,
      before: null,
      after: { code, status: 'issued', enrolmentId: enrolment.id },
      reason: 'Every Program A requirement passed',
    },
    run,
  )
  return code
}

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

const certificateColumns = {
  id: certificates.id,
  code: certificates.code,
  learnerId: certificates.learnerId,
  learnerName: certificates.learnerName,
  programmeCode: programmes.code,
  programmeTitle: programmes.title,
  status: certificates.status,
  issuedAt: certificates.issuedAt,
  revokedAt: certificates.revokedAt,
  evidence: certificates.evidence,
  completedAt: enrolments.completedAt,
}

function toView(row: {
  code: string
  learnerName: string
  programmeCode: string
  programmeTitle: string
  status: 'issued' | 'revoked'
  issuedAt: Date
  revokedAt: Date | null
  completedAt: Date | null
  evidence: Record<string, unknown>
}) {
  return {
    code: row.code,
    learnerName: row.learnerName,
    programmeCode: row.programmeCode,
    programmeTitle: row.programmeTitle,
    status: row.status,
    issuedAt: row.issuedAt.toISOString(),
    completedAt: (row.completedAt ?? row.issuedAt).toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    evidence: row.evidence,
  }
}

export type CertificateView = ReturnType<typeof toView>

/** The signed-in learner's certificates. Only Program A ever issues one. */
export async function listMine(learnerId: string) {
  const rows = await db
    .select(certificateColumns)
    .from(certificates)
    .innerJoin(programmes, eq(programmes.id, certificates.programmeId))
    .innerJoin(enrolments, eq(enrolments.id, certificates.enrolmentId))
    .where(and(eq(certificates.learnerId, learnerId), eq(programmes.certificationEnabled, true)))
    .orderBy(desc(certificates.issuedAt))
  return { items: rows.map(toView) }
}

async function findByCode(code: string) {
  const [row] = await db
    .select(certificateColumns)
    .from(certificates)
    .innerJoin(programmes, eq(programmes.id, certificates.programmeId))
    .innerJoin(enrolments, eq(enrolments.id, certificates.enrolmentId))
    .where(eq(certificates.code, code))
    .limit(1)
  return row ?? null
}

/** Owner or admin. Someone else's code answers "not found", so codes cannot be probed. */
export async function getForViewer(viewer: Viewer, code: string) {
  const row = await findByCode(code)
  if (!row || (viewer.role !== 'admin' && row.learnerId !== viewer.id)) {
    throw HttpError.notFound('Certificate not found')
  }
  return toView(row)
}

/** Public verification (brief §6 "verifiable demo certificate record"): minimal fields only. */
export async function verify(code: string) {
  const row = await findByCode(code)
  if (!row) return { found: false as const, code }
  return {
    found: true as const,
    code: row.code,
    learnerName: row.learnerName,
    programmeTitle: row.programmeTitle,
    status: row.status,
    issuedAt: row.issuedAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  }
}

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: QATAR_TIMEZONE,
  }).format(new Date(iso))

export async function pdfForViewer(viewer: Viewer, code: string) {
  const view = await getForViewer(viewer, code)
  const bytes = await renderCertificatePdf({
    learnerName: view.learnerName,
    programmeTitle: view.programmeTitle,
    code: view.code,
    completedOnLabel: dateLabel(view.completedAt),
    status: view.status,
    verifyUrl: `${env.CLIENT_URL[0] ?? ''}/certificates/verify/${view.code}`,
  })
  return { bytes, filename: `${view.code}.pdf` }
}

// ---------------------------------------------------------------------------------------------
// Admin: revoke and reissue (brief §6: admin-only actions with audit records)
// ---------------------------------------------------------------------------------------------

export async function revoke(viewer: Viewer, code: string, reason: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: certificates.id, status: certificates.status })
      .from(certificates)
      .where(eq(certificates.code, code))
      .limit(1)
    if (!row) throw HttpError.notFound('Certificate not found')
    if (row.status === 'revoked') throw HttpError.badRequest('This certificate is already revoked')
    await tx
      .update(certificates)
      .set({ status: 'revoked', revokedAt: now(), revokedBy: viewer.id, revokeReason: reason })
      .where(eq(certificates.id, row.id))
    await recordAudit(
      viewer,
      {
        action: 'certificate.revoke',
        objectType: 'certificate',
        objectId: code,
        before: { status: 'issued' },
        after: { status: 'revoked' },
        reason,
      },
      tx,
    )
    return { code, status: 'revoked' as const }
  })
}

export async function reissue(viewer: Viewer, code: string, reason: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(certificates).where(eq(certificates.code, code)).limit(1)
    if (!row) throw HttpError.notFound('Certificate not found')
    if (row.status !== 'revoked') {
      throw HttpError.badRequest('Revoke the certificate before reissuing it')
    }
    const newCode = await nextCode(tx)
    await tx.insert(certificates).values({
      code: newCode,
      enrolmentId: row.enrolmentId,
      learnerId: row.learnerId,
      programmeId: row.programmeId,
      learnerName: row.learnerName,
      status: 'issued',
      issuedAt: now(),
      issuedBy: viewer.id,
      reissuedFromId: row.id,
      evidence: row.evidence,
    })
    await recordAudit(
      viewer,
      {
        action: 'certificate.reissue',
        objectType: 'certificate',
        objectId: newCode,
        before: { code, status: 'revoked' },
        after: { code: newCode, status: 'issued' },
        reason,
      },
      tx,
    )
    return { code: newCode, status: 'issued' as const }
  })
}
