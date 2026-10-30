import type { ScorePolicy } from '@shared/constants'
import type { AssessmentAttemptRow, AssessmentRuleRow, AttemptGrantRow } from '@shared/types/db'
import { db } from '../api'

/**
 * Assessment rules as the engine reads them (SPEC §6): the newest published version per
 * programme and kind, how many attempts a learner may still start, and which score counts.
 */

export type RuleKind = 'pre' | 'post'

/** The rule new attempts follow: the highest published version for the programme and kind. */
export function activeRule(programme: 'A' | 'B', kind: RuleKind): AssessmentRuleRow | null {
  let best: AssessmentRuleRow | null = null
  for (const rule of db.assessmentRules) {
    if (rule.programme !== programme || rule.kind !== kind || rule.status !== 'published') continue
    if (!best || rule.version > best.version) best = rule
  }
  return best
}

/**
 * The pass percentage a published rule sets, or null when the kind has no pass gate.
 * Hook for the Program A certificate gate: `progress/rules.ts` still reads the 80 percent
 * `THRESHOLDS.finalAssessmentPass`; call this where the gate should follow the configured rule.
 */
export function publishedPassPercent(programme: 'A' | 'B', kind: RuleKind): number | null {
  return activeRule(programme, kind)?.passPercent ?? null
}

export const ruleById = (id: string | null) =>
  id ? (db.assessmentRules.find((r) => r.id === id) ?? null) : null

export function grantsFor(enrolmentId: string, assessmentId: string): AttemptGrantRow[] {
  return db.attemptGrants
    .filter((g) => g.enrolmentId === enrolmentId && g.assessmentId === assessmentId)
    .sort((a, b) => a.grantedAt.localeCompare(b.grantedAt))
}

export interface Allowance {
  limit: number
  /** Extra attempts an administrator granted, used or not. */
  granted: number
  /** Attempts started so far (open and submitted). */
  used: number
  remaining: number
  unusedGrant: AttemptGrantRow | null
}

/** Attempts allowed = the rule limit plus every grant; remaining = allowed minus attempts started. */
export function allowance(
  rule: Pick<AssessmentRuleRow, 'attemptLimit'>,
  enrolmentId: string,
  assessmentId: string,
): Allowance {
  const grants = grantsFor(enrolmentId, assessmentId)
  const used = db.assessmentAttempts.filter(
    (a) => a.enrolmentId === enrolmentId && a.assessmentId === assessmentId,
  ).length
  return {
    limit: rule.attemptLimit,
    granted: grants.length,
    used,
    remaining: Math.max(0, rule.attemptLimit + grants.length - used),
    unusedGrant: grants.find((g) => g.consumedByAttemptId === null) ?? null,
  }
}

/** The score that counts under the policy: the best submitted score, or the latest one. */
export function countedScore(
  policy: ScorePolicy,
  attempts: readonly Pick<AssessmentAttemptRow, 'score' | 'attemptNo' | 'status'>[],
): number | null {
  const submitted = attempts.filter((a) => a.status === 'submitted' && a.score !== null)
  if (submitted.length === 0) return null
  if (policy === 'latest') {
    const latest = [...submitted].sort((a, b) => b.attemptNo - a.attemptNo)[0]
    return latest?.score ?? null
  }
  return Math.max(...submitted.map((a) => a.score as number))
}
