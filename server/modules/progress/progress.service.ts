import { db } from '@server/db/connection'
import { courses, enrolments, unitProgress } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { issueCertificateIfMissing } from '@server/modules/certificates/certificates.service'
import { eq } from 'drizzle-orm'
import { findEnrolment, loadEvidence } from './progress.evidence'
import { assignmentApproved, evaluate } from './progress.rules'

/** The pooled db or a transaction. */
type Executor = Pick<typeof db, 'select' | 'insert' | 'update' | 'execute'>

/**
 * Re-derives an enrolment's status and progress from its programme's completion rules
 * (brief §5 B rules, §6 A gates, §17 "status must derive from the active enrolment requirements").
 *
 * Shared seam: any module whose change can move a learner forward (unit progress, assessment,
 * role-play, attendance/score finalised, assignment approved) calls this in the same transaction.
 * The learning-engine module owns the implementation; it also issues the Program A certificate
 * when every condition passes. Returns the enrolment's new status.
 *
 * Idempotent: it only writes what changed, the certificate insert is guarded by the
 * one-issued-certificate-per-enrolment index, and Program B or C never issue one.
 */
export async function recomputeEnrolment(
  learnerId: string,
  programmeCode: 'A' | 'B' | 'C',
  executor?: Executor,
): Promise<string | null> {
  const run = executor ?? db
  const enrolment = await findEnrolment(run, learnerId, programmeCode)
  if (!enrolment) return null

  const evidence = await loadEvidence(run, enrolment)

  // Program B: the short response (C05) completes when the trainer approves it (brief §5).
  if (programmeCode === 'B' && assignmentApproved(evidence.submissions)) {
    const c05 = evidence.units.get('C05')
    if (c05?.status !== 'completed') {
      await markUnitCompleted(run, enrolment.id, 'C05')
      const mutable = new Map(evidence.units)
      mutable.set('C05', {
        status: 'completed',
        percent: 100,
        scoreRaw: c05?.scoreRaw ?? null,
        completedAt: now(),
      })
      evidence.units = mutable
    }
  }

  const result = evaluate(evidence)
  const instant = now()
  const patch: Partial<typeof enrolments.$inferInsert> = {}
  if (result.status !== enrolment.status) patch.status = result.status
  if (result.progressPercent !== enrolment.progressPercent) {
    patch.progressPercent = result.progressPercent
  }
  if (result.currentStage !== enrolment.currentStage) patch.currentStage = result.currentStage
  if (result.status !== 'not_started' && !enrolment.startedAt) patch.startedAt = instant
  if (result.complete && !enrolment.completedAt) patch.completedAt = instant
  if (!result.complete && enrolment.completedAt) patch.completedAt = null

  if (Object.keys(patch).length > 0) {
    await run.update(enrolments).set(patch).where(eq(enrolments.id, enrolment.id))
  }

  // Certificates: Program A only, and only when the programme has certification switched on.
  if (result.certificateEligible && programmeCode === 'A' && enrolment.certificationEnabled) {
    await issueCertificateIfMissing(run, enrolment, evidence)
  }

  return result.status
}

async function markUnitCompleted(run: Executor, enrolmentId: string, code: string) {
  const [course] = await run
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.code, code))
    .limit(1)
  if (!course) return
  const instant = now()
  await run
    .insert(unitProgress)
    .values({
      enrolmentId,
      courseId: course.id,
      status: 'completed',
      percent: 100,
      completedAt: instant,
      lastActivityAt: instant,
    })
    .onConflictDoUpdate({
      target: [unitProgress.enrolmentId, unitProgress.courseId],
      set: { status: 'completed', percent: 100, completedAt: instant, lastActivityAt: instant },
    })
}
