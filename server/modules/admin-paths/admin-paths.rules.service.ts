import { db } from '@server/db/connection'
import {
  assessmentAttempts,
  assessments,
  assignmentRules,
  enrolments,
  learningPaths,
  organisations,
  pathVersions,
  profiles,
  programmes,
  rolePlayAttempts,
  submissions,
  unitProgress,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import { COMPETENCIES, type ProgrammeCode } from '@shared/constants'
import {
  type RuleDefinition,
  type RuleGroup,
  type RuleProfile,
  resolvePathRule,
} from '@shared/content/paths'
import type { MatchPreviewInput, PreviewRule, RuleInput } from '@shared/schemas/admin-paths'
import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { explainGroup } from './admin-paths.rules'
import { getPath, getPathRow } from './admin-paths.service'

/**
 * Assignment rules, the match preview, the learner-experience preview and path overrides
 * (brief §14). Rule matching uses `resolvePathRule` from shared/content/paths.ts.
 */

async function programmeId(code: ProgrammeCode) {
  const [row] = await db
    .select({ id: programmes.id })
    .from(programmes)
    .where(eq(programmes.code, code))
    .limit(1)
  if (!row) throw HttpError.notFound('Programme not found')
  return row.id
}

async function assertPathInProgramme(pathId: string, programme: ProgrammeCode) {
  const path = await getPathRow(pathId)
  if (path.programme !== programme)
    throw HttpError.badRequest('The rule must point at a path in the same programme')
  return path
}

async function nextRuleCode(programme: ProgrammeCode) {
  const rows = await db.select({ code: assignmentRules.code }).from(assignmentRules)
  const used = new Set(rows.map((r) => r.code))
  let n = 1
  while (used.has(`RULE-${programme}-${String(n).padStart(2, '0')}`)) n++
  return `RULE-${programme}-${String(n).padStart(2, '0')}`
}

function validateRuleShape(input: RuleInput) {
  if (input.isDefault && input.conditions.conditions.length > 0)
    throw HttpError.badRequest(
      'The default rule has no conditions: it applies when nothing else matches',
    )
  if (!input.isDefault && input.conditions.conditions.length === 0)
    throw HttpError.badRequest('Add at least one condition, or make this the default rule')
}

export async function createRule(viewer: Viewer, input: RuleInput, requestId?: string) {
  validateRuleShape(input)
  if (input.isDefault)
    throw HttpError.badRequest('Each programme already has one default rule. Edit it instead.')
  const path = await assertPathInProgramme(input.pathId, input.programme)
  const progId = await programmeId(input.programme)
  const code = await nextRuleCode(input.programme)
  return db.transaction(async (tx) => {
    const at = now()
    const [rule] = await tx
      .insert(assignmentRules)
      .values({
        code,
        programmeId: progId,
        pathId: input.pathId,
        name: input.name,
        summary: input.summary,
        conditions: input.conditions as RuleGroup,
        priority: input.priority,
        isDefault: false,
        status: input.status,
        createdAt: at,
        updatedAt: at,
      })
      .returning({ id: assignmentRules.id })
    await recordAudit(
      viewer,
      {
        action: 'rule.create',
        objectType: 'assignment_rule',
        objectId: code,
        after: {
          name: input.name,
          path: path.code,
          priority: input.priority,
          status: input.status,
          summary: input.summary,
        },
      },
      tx,
      requestId,
    )
    return { id: rule?.id ?? '', code }
  })
}

export async function updateRule(
  viewer: Viewer,
  ruleId: string,
  input: RuleInput,
  requestId?: string,
) {
  const [existing] = await db
    .select({
      id: assignmentRules.id,
      code: assignmentRules.code,
      name: assignmentRules.name,
      priority: assignmentRules.priority,
      status: assignmentRules.status,
      isDefault: assignmentRules.isDefault,
      summary: assignmentRules.summary,
      conditions: assignmentRules.conditions,
      pathCode: learningPaths.code,
      programme: programmes.code,
    })
    .from(assignmentRules)
    .innerJoin(learningPaths, eq(learningPaths.id, assignmentRules.pathId))
    .innerJoin(programmes, eq(programmes.id, assignmentRules.programmeId))
    .where(eq(assignmentRules.id, ruleId))
    .limit(1)
  if (!existing) throw HttpError.notFound('Rule not found')
  if (existing.programme !== input.programme)
    throw HttpError.badRequest('A rule cannot move to another programme')
  if (existing.isDefault !== input.isDefault)
    throw HttpError.badRequest('The default rule stays the default. Set a default path instead.')
  if (existing.isDefault && input.status !== 'published')
    throw HttpError.badRequest('The default rule must stay published')
  validateRuleShape(input)
  const path = await assertPathInProgramme(input.pathId, input.programme)

  return db.transaction(async (tx) => {
    await tx
      .update(assignmentRules)
      .set({
        name: input.name,
        summary: input.summary,
        pathId: input.pathId,
        conditions: input.conditions as RuleGroup,
        priority: input.priority,
        status: input.status,
        updatedAt: now(),
      })
      .where(eq(assignmentRules.id, ruleId))
    await recordAudit(
      viewer,
      {
        action: 'rule.update',
        objectType: 'assignment_rule',
        objectId: existing.code,
        before: {
          name: existing.name,
          path: existing.pathCode,
          priority: existing.priority,
          status: existing.status,
          summary: existing.summary,
          conditions: existing.conditions,
        },
        after: {
          name: input.name,
          path: path.code,
          priority: input.priority,
          status: input.status,
          summary: input.summary,
          conditions: input.conditions,
        },
      },
      tx,
      requestId,
    )
    return { id: ruleId, code: existing.code }
  })
}

// ---------------------------------------------------------------------------------------------
// Profiles and preview
// ---------------------------------------------------------------------------------------------

async function learnerProfile(learnerCode: string) {
  const [row] = await db
    .select({
      userId: profiles.userId,
      learnerCode: profiles.learnerCode,
      fullName: profiles.fullName,
      organisationName: organisations.name,
      organisationType: organisations.type,
      jobTitle: profiles.jobTitle,
      jobFunction: profiles.jobFunction,
      seniority: profiles.seniority,
      experience: profiles.experience,
      goals: profiles.goals,
      status: profiles.status,
    })
    .from(profiles)
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .where(eq(profiles.learnerCode, learnerCode))
    .limit(1)
  if (!row) throw HttpError.notFound(`No learner with ID ${learnerCode}`)

  // Baseline weak competency: the lowest-scoring competency on the earliest pre-assessment.
  const [pre] = await db
    .select({ scores: assessmentAttempts.competencyScores })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .where(and(eq(assessmentAttempts.learnerId, row.userId), eq(assessments.kind, 'pre')))
    .orderBy(asc(assessmentAttempts.startedAt))
    .limit(1)
  let weak: string | null = null
  if (pre?.scores) {
    const scores = pre.scores
    weak = [...COMPETENCIES].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0))[0] ?? null
  }

  const ruleProfile: RuleProfile = {
    organisationType: row.organisationType ?? null,
    organisation: row.organisationName ?? null,
    jobFunction: row.jobFunction ?? null,
    jobTitle: row.jobTitle ?? null,
    seniority: row.seniority ?? null,
    experience: row.experience ?? null,
    goals: (row.goals ?? []) as RuleProfile['goals'],
    baselineWeakCompetency: weak,
    complete: row.status === 'complete',
  }
  return { row, ruleProfile }
}

async function learnerEnrolments(userId: string) {
  const rows = await db
    .select({
      id: enrolments.id,
      programme: programmes.code,
      status: enrolments.status,
      pathId: enrolments.pathId,
      pathName: learningPaths.name,
      pathCode: learningPaths.code,
      version: pathVersions.version,
      assignmentReason: enrolments.assignmentReason,
      overrideReason: enrolments.overrideReason,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .leftJoin(learningPaths, eq(learningPaths.id, enrolments.pathId))
    .leftJoin(pathVersions, eq(pathVersions.id, enrolments.pathVersionId))
    .where(eq(enrolments.learnerId, userId))
    .orderBy(programmes.code)
  return rows
}

async function savedRules(programme: ProgrammeCode): Promise<PreviewRule[]> {
  const rows = await db
    .select({
      id: assignmentRules.id,
      name: assignmentRules.name,
      pathId: assignmentRules.pathId,
      priority: assignmentRules.priority,
      isDefault: assignmentRules.isDefault,
      conditions: assignmentRules.conditions,
      summary: assignmentRules.summary,
      status: assignmentRules.status,
    })
    .from(assignmentRules)
    .innerJoin(programmes, eq(programmes.id, assignmentRules.programmeId))
    .where(and(eq(programmes.code, programme), ne(assignmentRules.status, 'archived')))
    .orderBy(desc(assignmentRules.priority))
  return rows.map((row) => ({
    ...row,
    programme,
    conditions: row.conditions as PreviewRule['conditions'],
  }))
}

/**
 * Evaluates a rule set against one learner. Saved rules: only published rules take part.
 * An unsaved set (the editor's what-if) takes part in full, except archived rules.
 */
export async function previewMatch(input: MatchPreviewInput) {
  const { row, ruleProfile } = await learnerProfile(input.learnerCode)
  const all = input.rules ?? (await savedRules(input.programme))
  const active = all.filter((rule) =>
    input.rules ? rule.status !== 'archived' : rule.status === 'published',
  )

  const pathNames = new Map(
    (
      await db
        .select({ id: learningPaths.id, name: learningPaths.name, code: learningPaths.code })
        .from(learningPaths)
    ).map((p) => [p.id, p]),
  )

  const defs: RuleDefinition[] = active.map((rule, index) => ({
    code: rule.id ?? `unsaved-${index}`,
    name: rule.name,
    programme: input.programme,
    pathCode: rule.pathId,
    priority: rule.priority,
    isDefault: rule.isDefault,
    conditions: rule.conditions as RuleGroup,
    summary: rule.summary,
    variation: '',
  }))
  if (!defs.some((d) => d.isDefault))
    throw HttpError.badRequest('The programme needs a published default rule')
  const resolution = resolvePathRule(input.programme, ruleProfile, defs)
  const winnerPath = pathNames.get(resolution.rule.pathCode)

  return {
    learner: {
      learnerCode: row.learnerCode,
      fullName: row.fullName,
      profileStatus: row.status,
      enrolments: await learnerEnrolments(row.userId),
    },
    profile: ruleProfile,
    evaluations: all
      .map((rule, index) => ({
        id: rule.id ?? null,
        key: rule.id ?? `unsaved-${index}`,
        name: rule.name,
        summary: rule.summary,
        priority: rule.priority,
        isDefault: rule.isDefault,
        status: rule.status,
        pathId: rule.pathId,
        pathName: pathNames.get(rule.pathId)?.name ?? 'Unknown path',
        considered: active.includes(rule),
        result: explainGroup(rule.conditions as RuleGroup, ruleProfile),
        winner: (rule.id ?? `unsaved-${index}`) === resolution.rule.code,
      }))
      .sort((a, b) => b.priority - a.priority),
    resolution: {
      reason: resolution.reason,
      ruleName: resolution.rule.name,
      priority: resolution.rule.priority,
      pathId: resolution.rule.pathCode,
      pathName: winnerPath?.name ?? 'Unknown path',
      pathCode: winnerPath?.code ?? null,
      usedDefault: resolution.rule.isDefault,
    },
  }
}

/** The path as a learner would see it: items in order, with this learner's progress. */
export async function experience(pathId: string, learnerCode: string, versionId?: string) {
  const detail = await getPath(pathId)
  const version =
    (versionId && detail.versions.find((v) => v.id === versionId)) ||
    detail.versions.find((v) => v.status === 'draft') ||
    detail.versions.find((v) => v.isCurrent) ||
    detail.versions[0]
  if (!version) throw HttpError.notFound('This path has no versions')
  const { row } = await learnerProfile(learnerCode)

  const [enrolment] = await db
    .select({ id: enrolments.id, status: enrolments.status, pathId: enrolments.pathId })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(and(eq(enrolments.learnerId, row.userId), eq(programmes.code, detail.path.programme)))
    .limit(1)

  const progress = new Map<string, { status: string; percent: number }>()
  const attempts = new Map<string, number>()
  let practised = false
  let submission: string | null = null
  if (enrolment) {
    const [units, tries, plays, subs] = await Promise.all([
      db
        .select({
          courseId: unitProgress.courseId,
          status: unitProgress.status,
          percent: unitProgress.percent,
        })
        .from(unitProgress)
        .where(eq(unitProgress.enrolmentId, enrolment.id)),
      db
        .select({ kind: assessments.kind, score: assessmentAttempts.score })
        .from(assessmentAttempts)
        .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
        .where(
          and(
            eq(assessmentAttempts.enrolmentId, enrolment.id),
            eq(assessmentAttempts.status, 'submitted'),
          ),
        ),
      db
        .select({ id: rolePlayAttempts.id })
        .from(rolePlayAttempts)
        .where(eq(rolePlayAttempts.enrolmentId, enrolment.id))
        .limit(1),
      db
        .select({ status: submissions.status })
        .from(submissions)
        .where(eq(submissions.enrolmentId, enrolment.id))
        .orderBy(desc(submissions.version))
        .limit(1),
    ])
    for (const u of units) progress.set(u.courseId, { status: u.status, percent: u.percent })
    for (const t of tries) if (t.score !== null) attempts.set(t.kind, t.score)
    practised = plays.length > 0
    submission = subs[0]?.status ?? null
  }

  const kindAssessment = {
    assessment_pre: 'pre',
    assessment_post: 'post',
    assessment_formative: 'formative',
  } as const
  const items = version.items.map((item) => {
    let state: 'completed' | 'in_progress' | 'not_started' = 'not_started'
    let detailText: string | null = null
    if ((item.kind === 'course' || item.kind === 'session') && item.courseId) {
      const p = progress.get(item.courseId)
      if (p) {
        state = p.status as typeof state
        detailText = p.status === 'in_progress' ? `${p.percent}% complete` : null
      }
    } else if (item.kind in kindAssessment) {
      const score = attempts.get(kindAssessment[item.kind as keyof typeof kindAssessment])
      if (score !== undefined) {
        state = 'completed'
        detailText = `Score ${score}`
      }
    } else if (item.kind === 'ai_practice') {
      state = practised ? 'completed' : 'not_started'
    } else if (item.kind === 'assignment' && submission) {
      state = submission === 'approved' ? 'completed' : 'in_progress'
      detailText =
        submission === 'returned'
          ? 'Returned for revision'
          : submission === 'approved'
            ? 'Approved'
            : 'Awaiting review'
    }
    return { ...item, state, detail: detailText }
  })

  return {
    path: detail.path,
    version: { id: version.id, version: version.version, status: version.status },
    learner: {
      learnerCode: row.learnerCode,
      fullName: row.fullName,
      enrolled: Boolean(enrolment),
      onThisPath: enrolment?.pathId === pathId,
      enrolmentStatus: enrolment?.status ?? null,
    },
    items,
  }
}

/** Manual path override with a reason (brief §14), audited as enrolment.path_override. */
export async function overridePath(
  viewer: Viewer,
  input: { enrolmentId: string; pathId: string; reason: string },
  requestId?: string,
) {
  const [current] = await db
    .select({
      id: enrolments.id,
      programme: programmes.code,
      pathId: enrolments.pathId,
      pathCode: learningPaths.code,
      learnerCode: profiles.learnerCode,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .innerJoin(profiles, eq(profiles.userId, enrolments.learnerId))
    .leftJoin(learningPaths, eq(learningPaths.id, enrolments.pathId))
    .where(eq(enrolments.id, input.enrolmentId))
    .limit(1)
  if (!current) throw HttpError.notFound('Enrolment not found')
  const target = await getPathRow(input.pathId)
  if (target.programme !== current.programme)
    throw HttpError.badRequest('The new path must belong to the same programme')
  if (!target.currentVersionId) throw HttpError.badRequest('Publish the path before assigning it')
  if (current.pathId === input.pathId)
    throw HttpError.badRequest('The learner is already on this path')

  return db.transaction(async (tx) => {
    await tx
      .update(enrolments)
      .set({
        pathId: input.pathId,
        pathVersionId: target.currentVersionId,
        overrideReason: input.reason,
        overriddenBy: viewer.id,
        assignmentReason: `Administrator override: ${target.name}`,
        updatedAt: now(),
      })
      .where(eq(enrolments.id, input.enrolmentId))
    await recordAudit(
      viewer,
      {
        action: 'enrolment.path_override',
        objectType: 'enrolment',
        objectId: input.enrolmentId,
        before: { learner: current.learnerCode, path: current.pathCode },
        after: { learner: current.learnerCode, path: target.code },
        reason: input.reason,
      },
      tx,
      requestId,
    )
    return { enrolmentId: input.enrolmentId, path: target.code }
  })
}
