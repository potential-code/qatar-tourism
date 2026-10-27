import type { db } from '@server/db/connection'

/** The pooled db or a transaction. */
type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>

/**
 * Re-derives an enrolment's status and progress from its programme's completion rules
 * (brief §5 B rules, §6 A gates, §17 "status must derive from the active enrolment requirements").
 *
 * Shared seam: any module whose change can move a learner forward (unit progress, assessment,
 * role-play, attendance/score finalised, assignment approved) calls this in the same transaction.
 * The learning-engine module owns the implementation; it also issues the Program A certificate
 * when every condition passes. Returns the enrolment's new status.
 */
export async function recomputeEnrolment(
  _learnerId: string,
  _programmeCode: 'A' | 'B' | 'C',
  _executor?: Executor,
): Promise<string | null> {
  // Implemented by the learning-engine agent (Phase 2, agent B).
  return null
}
