import type { db } from '@server/db/connection'
import {
  assignmentRules,
  learningPaths,
  organisations,
  profiles,
  programmes,
  user,
} from '@server/db/schema'
import type {
  ExperienceBand,
  JobFunction,
  LearningGoal,
  OrganisationType,
  ProgrammeCode,
  Seniority,
} from '@shared/constants'
import {
  type RuleDefinition,
  type RuleGroup,
  type RuleProfile,
  resolvePathRule,
} from '@shared/content/paths'
import { and, desc, eq } from 'drizzle-orm'

/**
 * Learner-side path resolution (brief §4, §9, §14). The administrator owns the rules (Academy
 * Management); this service only reads the PUBLISHED rules and applies the shared evaluator,
 * so the AI path generator can never invent a path or skip the rule priority.
 */

type Reader = Pick<typeof db, 'select'>

export type LearnerProfile = {
  userId: string
  fullName: string
  learnerCode: string | null
  organisationName: string | null
  organisationType: OrganisationType | null
  jobTitle: string | null
  jobFunction: JobFunction | null
  seniority: Seniority | null
  experience: ExperienceBand | null
  goals: LearningGoal[]
  weeklyMinutes: number | null
  preferredLanguage: string | null
  complete: boolean
  completeness: number
}

export async function loadLearnerProfile(reader: Reader, userId: string): Promise<LearnerProfile> {
  const [row] = await reader
    .select({
      userName: user.name,
      fullName: profiles.fullName,
      learnerCode: profiles.learnerCode,
      organisationName: organisations.name,
      organisationOther: profiles.organisationOther,
      organisationType: organisations.type,
      jobTitle: profiles.jobTitle,
      jobFunction: profiles.jobFunction,
      seniority: profiles.seniority,
      experience: profiles.experience,
      goals: profiles.goals,
      weeklyMinutes: profiles.weeklyMinutes,
      preferredLanguage: profiles.preferredLanguage,
      status: profiles.status,
      completeness: profiles.completeness,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .where(eq(user.id, userId))
    .limit(1)
  return {
    userId,
    fullName: row?.fullName ?? row?.userName ?? 'Learner',
    learnerCode: row?.learnerCode ?? null,
    organisationName: row?.organisationName ?? row?.organisationOther ?? null,
    organisationType: row?.organisationType ?? null,
    jobTitle: row?.jobTitle ?? null,
    jobFunction: row?.jobFunction ?? null,
    seniority: row?.seniority ?? null,
    experience: row?.experience ?? null,
    goals: (row?.goals ?? []) as LearningGoal[],
    weeklyMinutes: row?.weeklyMinutes ?? null,
    preferredLanguage: row?.preferredLanguage ?? null,
    complete: row?.status === 'complete',
    completeness: row?.completeness ?? 0,
  }
}

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

/** Published rules for a programme, in the shape the shared evaluator expects. */
export async function publishedRules(
  reader: Reader,
  programme: ProgrammeCode,
): Promise<(RuleDefinition & { pathId: string; currentVersionId: string | null })[]> {
  const rows = await reader
    .select({
      code: assignmentRules.code,
      name: assignmentRules.name,
      summary: assignmentRules.summary,
      conditions: assignmentRules.conditions,
      priority: assignmentRules.priority,
      isDefault: assignmentRules.isDefault,
      pathId: learningPaths.id,
      pathCode: learningPaths.code,
      currentVersionId: learningPaths.currentVersionId,
    })
    .from(assignmentRules)
    .innerJoin(programmes, eq(programmes.id, assignmentRules.programmeId))
    .innerJoin(learningPaths, eq(learningPaths.id, assignmentRules.pathId))
    .where(and(eq(programmes.code, programme), eq(assignmentRules.status, 'published')))
    .orderBy(desc(assignmentRules.priority), assignmentRules.code)
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    programme,
    pathCode: row.pathCode,
    priority: row.priority,
    isDefault: row.isDefault,
    conditions: row.conditions as RuleGroup,
    summary: row.summary,
    variation: '',
    pathId: row.pathId,
    currentVersionId: row.currentVersionId,
  }))
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
export async function resolveForProfile(
  reader: Reader,
  programme: ProgrammeCode,
  profile: RuleProfile,
): Promise<ResolvedPath | null> {
  const rules = await publishedRules(reader, programme)
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

export async function pathSummary(reader: Reader, pathId: string | null) {
  if (!pathId) return null
  const [row] = await reader
    .select({
      id: learningPaths.id,
      code: learningPaths.code,
      name: learningPaths.name,
      description: learningPaths.description,
    })
    .from(learningPaths)
    .where(eq(learningPaths.id, pathId))
    .limit(1)
  return row ?? null
}
