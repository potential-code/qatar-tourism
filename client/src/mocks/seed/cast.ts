import type { ActivityResult } from './activity'
import type { LearnerSeed } from './learners'
import { MARIAM_N } from './personas'
import type { EnrolmentPlan, SeedPlan } from './plan'

/**
 * The learners chosen to carry the 29 Oct demonstration states. Picked deterministically from the
 * existing 1,200 (lowest learner numbers first within a stage; the locked account from the high
 * end), so no new users are created and nobody is picked twice. Mariam is a fixed persona.
 */
export type Cast = {
  mariam: LearnerSeed
  mariamA: EnrolmentPlan
  /** Holds a current Program A certificate that renews an earlier, now superseded, one. */
  renewed: EnrolmentPlan
  /** Holds only an expired prior-cycle credential. */
  expired: EnrolmentPlan
  /** Holds a revoked prior-cycle credential. */
  revoked: EnrolmentPlan
  /** Learners with an enrolment request for Program A: three pending, one rejected. */
  enrolPending: LearnerSeed[]
  enrolRejected: LearnerSeed
  /** External certificate submitters: two pending (Mariam is the other), verified, rejected. */
  extPending: LearnerSeed
  extVerified: LearnerSeed
  extRejected: LearnerSeed
  /** The locked account (not a persona). */
  locked: LearnerSeed
}

export function pickCast(
  learners: readonly LearnerSeed[],
  plan: SeedPlan,
  activity: ActivityResult,
): Cast {
  const byN = (a: { learner: LearnerSeed }, b: { learner: LearnerSeed }) =>
    a.learner.n - b.learner.n
  const hasCertificate = new Set(activity.certificates.map((c) => c.enrolmentId))
  const enrolments = (programme: 'A' | 'B', stage: string) =>
    plan.enrolments
      .filter((e) => e.programme === programme && e.stage === stage && !e.learner.persona)
      .sort(byN)

  const renewed = enrolments('A', 'completed').find((e) => hasCertificate.has(e.id))
  const expired = enrolments('A', 'l1_done')[0]
  const revoked = enrolments('A', 'attended')[0]
  const early = enrolments('A', 'l1_early')
  const bOnly = plan.enrolments
    .filter((e) => e.programme === 'B' && e.learner.group === 'B' && e.stage === 'completed')
    .filter((e) => !e.learner.persona)
    .sort(byN)
    .map((e) => e.learner)
  const cOnly = learners.filter((l) => l.group === 'C' && !l.persona).sort((a, b) => b.n - a.n)
  const mariam = learners.find((l) => l.n === MARIAM_N)
  const mariamA = plan.enrolments.find((e) => e.learner.n === MARIAM_N && e.programme === 'A')

  if (!renewed || !expired || !revoked || !mariam || !mariamA)
    throw new Error('Seed cast: stage pools empty')
  const [extPending, extVerified, extRejected] = early.map((e) => e.learner)
  const [p1, p2, p3, rejected] = bOnly
  const locked = cOnly[0]
  if (!extPending || !extVerified || !extRejected || !p1 || !p2 || !p3 || !rejected || !locked)
    throw new Error('Seed cast: not enough learners')
  return {
    mariam,
    mariamA,
    renewed,
    expired,
    revoked,
    enrolPending: [p1, p2, p3],
    enrolRejected: rejected,
    extPending,
    extVerified,
    extRejected,
    locked,
  }
}
