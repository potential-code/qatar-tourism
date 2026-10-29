import type { ProgrammeCode } from '@shared/constants'
import { type RuleDefinition, type RuleProfile, resolvePathRule } from '@shared/content/paths'
import { db } from '../api'
import type { LearnerProfile } from './learner-profile'

/**
 * Learner-side path resolution (brief §4, §9, §14), formerly server/modules/paths/paths.service.ts.
 * The administrator owns the rules (Academy Management); this only reads the PUBLISHED rules and
 * applies the shared evaluator, so the AI path generator can never invent a path or skip the
 * rule priority.
 */

export function toRuleProfile(
  profile: LearnerProfile,
  weakCompetency?: string | null,
): RuleProfile {
  return {
    organisationType: profile.organisationType,
    organisation: profile.organisationName,
    jobFunction: profile.jobFunction,
    jobTitle: profile.jobTitle,
    seniority: profile.seniority,
    experience: profile.experience,
    goals: profile.goals,
    baselineWeakCompetency: weakCompetency ?? null,
    complete: profile.complete,
  }
}

type PublishedRule = RuleDefinition & { pathId: string; currentVersionId: string | null }

/** Published rules for a programme, highest priority first, in the evaluator's shape. */
export function publishedRules(programme: ProgrammeCode): PublishedRule[] {
  const programmeRow = db.programmes.find((p) => p.code === programme)
  if (!programmeRow) return []
  return db.assignmentRules
    .filter((rule) => rule.programmeId === programmeRow.id && rule.status === 'published')
    .sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code))
    .flatMap((rule) => {
      const path = db.learningPaths.find((p) => p.id === rule.pathId)
      if (!path) return []
      return [
        {
          code: rule.code,
          name: rule.name,
          programme,
          pathCode: path.code,
          priority: rule.priority,
          isDefault: rule.isDefault,
          conditions: rule.conditions,
          summary: rule.summary,
          variation: '',
          pathId: path.id,
          currentVersionId: path.currentVersionId,
        },
      ]
    })
}

export type ResolvedPath = {
  ruleCode: string
  ruleName: string
  ruleSummary: string
  priority: number
  reason: string
  pathId: string
  pathCode: string
  pathVersionId: string | null
}

/** The highest-priority published rule that matches, else the programme default (brief §14). */
export function resolveForProfile(
  programme: ProgrammeCode,
  profile: RuleProfile,
): ResolvedPath | null {
  const rules = publishedRules(programme)
  if (rules.length === 0) return null
  const { rule, reason } = resolvePathRule(programme, profile, rules)
  const match = rules.find((r) => r.code === rule.code) ?? rules[0]
  if (!match) return null
  return {
    ruleCode: match.code,
    ruleName: match.name,
    ruleSummary: match.summary,
    priority: match.priority,
    reason,
    pathId: match.pathId,
    pathCode: match.pathCode,
    pathVersionId: match.currentVersionId,
  }
}

/** The version number of a path version, or null. */
export function versionNumber(versionId: string | null): number | null {
  if (!versionId) return null
  return db.pathVersions.find((v) => v.id === versionId)?.version ?? null
}
