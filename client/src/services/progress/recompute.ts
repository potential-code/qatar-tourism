import type { ProgrammeCode } from '@shared/constants'
import type { EnrolmentRow } from '@shared/types/db'
import { db, insertRow, nowIso, updateRow } from '../api'
import { issueCertificateIfMissing } from '../certificates/issue'
import { findEnrolment, findEnrolmentRow, loadEvidence } from './evidence'
import { assignmentApproved, evaluate } from './rules'

/**
 * Re-derives an enrolment's status and progress from its programme's completion rules
 * (brief §5 B rules, §6 A gates, §17 "status must derive from the active enrolment requirements").
 *
 * Shared seam: any service whose change can move a learner forward (unit progress, assessment,
 * role-play, attendance/score finalised, assignment approved) calls this right after the change,
 * before `commit()`. It also issues the Program A certificate when every condition passes.
 * Synchronous and idempotent: it only writes what changed, and Program B or C never issue one.
 * Returns the enrolment's new status, or null when the learner is not enrolled.
 */
export function recomputeEnrolment(learnerId: string, programmeCode: ProgrammeCode): string | null {
  const enrolment = findEnrolment(learnerId, programmeCode)
  const found = findEnrolmentRow(learnerId, programmeCode)
  if (!enrolment || !found) return null

  const evidence = loadEvidence(enrolment)

  // Program B: the short response (C05) completes when the trainer approves it (brief §5).
  if (programmeCode === 'B' && assignmentApproved(evidence.submissions)) {
    const c05 = evidence.units.get('C05')
    if (c05?.status !== 'completed') {
      markUnitCompleted(enrolment.id, 'C05')
      const mutable = new Map(evidence.units)
      mutable.set('C05', {
        status: 'completed',
        percent: 100,
        scoreRaw: c05?.scoreRaw ?? null,
        completedAt: new Date(nowIso()),
      })
      evidence.units = mutable
    }
  }

  const result = evaluate(evidence)
  const instant = nowIso()
  const row = found.row
  const patch: Partial<EnrolmentRow> = {}
  if (result.status !== row.status) patch.status = result.status
  if (result.progressPercent !== row.progressPercent) patch.progressPercent = result.progressPercent
  if (result.currentStage !== row.currentStage) patch.currentStage = result.currentStage
  if (result.status !== 'not_started' && !row.startedAt) patch.startedAt = instant
  if (result.complete && !row.completedAt) patch.completedAt = instant
  if (!result.complete && row.completedAt) patch.completedAt = null
  if (Object.keys(patch).length > 0) updateRow(row, patch)

  // Certificates: Program A only, and only when the programme has certification switched on.
  if (result.certificateEligible && programmeCode === 'A' && enrolment.certificationEnabled) {
    issueCertificateIfMissing(enrolment, evidence)
  }
  return result.status
}

function markUnitCompleted(enrolmentId: string, code: string): void {
  const course = db.courses.find((c) => c.code === code)
  if (!course) return
  const instant = nowIso()
  const done = { status: 'completed' as const, percent: 100, completedAt: instant }
  const unit = db.unitProgress.find(
    (u) => u.enrolmentId === enrolmentId && u.courseId === course.id,
  )
  if (unit) updateRow(unit, { ...done, lastActivityAt: instant })
  else
    insertRow('unitProgress', {
      enrolmentId,
      courseId: course.id,
      ...done,
      lastActivityAt: instant,
    })
}
