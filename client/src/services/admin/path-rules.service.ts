import { COMPETENCIES, type ProgrammeCode } from '@shared/constants'
import {
  type RuleDefinition,
  type RuleGroup,
  type RuleProfile,
  resolvePathRule,
} from '@shared/content/paths'
import {
  experienceQuery,
  type MatchPreviewInput,
  matchPreviewInput,
  overrideInput,
  type PreviewRule,
  pathIdParam,
  type RuleInput,
  ruleIdParam,
  ruleInput,
} from '@shared/schemas/admin-paths'
import type { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  findOr404,
  indexBy,
  insertRow,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'
import { pathDetail, pathRow } from './paths/reads'
import { explainGroup } from './paths/rules'

/**
 * Assignment rules, the match preview, the learner-experience preview and path overrides
 * (brief §14), formerly admin-paths.rules.service.ts. Admin only, every change audited. Matching
 * uses `resolvePathRule` from shared/content/paths.ts, the same code enrolment uses, so the
 * preview cannot disagree with real assignment.
 */

function assertPathInProgramme(pathId: string, programme: ProgrammeCode) {
  const path = pathRow(pathId)
  if (path.programme !== programme)
    throw ApiError.badRequest('The rule must point at a path in the same programme')
  return path
}

function nextRuleCode(programme: ProgrammeCode) {
  const used = new Set(db.assignmentRules.map((r) => r.code))
  let n = 1
  while (used.has(`RULE-${programme}-${String(n).padStart(2, '0')}`)) n++
  return `RULE-${programme}-${String(n).padStart(2, '0')}`
}

function validateRuleShape(input: RuleInput) {
  if (input.isDefault && input.conditions.conditions.length > 0)
    throw ApiError.badRequest(
      'The default rule has no conditions: it applies when nothing else matches',
    )
  if (!input.isDefault && input.conditions.conditions.length === 0)
    throw ApiError.badRequest('Add at least one condition, or make this the default rule')
}

export async function createRule(input: z.input<typeof ruleInput>) {
  await delay()
  requireRole('admin')
  const data = parseInput(ruleInput, input)
  validateRuleShape(data)
  if (data.isDefault)
    throw ApiError.badRequest('Each programme already has one default rule. Edit it instead.')
  const path = assertPathInProgramme(data.pathId, data.programme)
  const programme = findOr404(
    db.programmes,
    (p) => p.code === data.programme,
    'Programme not found',
  )
  const code = nextRuleCode(data.programme)
  const rule = insertRow('assignmentRules', {
    code,
    programmeId: programme.id,
    pathId: data.pathId,
    name: data.name,
    summary: data.summary,
    conditions: data.conditions as RuleGroup,
    priority: data.priority,
    isDefault: false,
    status: data.status,
  })
  audit({
    action: 'rule.create',
    objectType: 'assignment_rule',
    objectId: code,
    after: {
      name: data.name,
      path: path.code,
      priority: data.priority,
      status: data.status,
      summary: data.summary,
    },
  })
  commit()
  return { id: rule.id, code }
}

export async function updateRule(ruleId: string, input: z.input<typeof ruleInput>) {
  await delay()
  requireRole('admin')
  parseInput(ruleIdParam, { ruleId }, 'param')
  const data = parseInput(ruleInput, input)
  const existing = findOr404(db.assignmentRules, (r) => r.id === ruleId, 'Rule not found')
  const existingProgramme = db.programmes.find((p) => p.id === existing.programmeId)?.code
  const existingPath = db.learningPaths.find((p) => p.id === existing.pathId)?.code ?? null
  if (existingProgramme !== data.programme)
    throw ApiError.badRequest('A rule cannot move to another programme')
  if (existing.isDefault !== data.isDefault)
    throw ApiError.badRequest('The default rule stays the default. Set a default path instead.')
  if (existing.isDefault && data.status !== 'published')
    throw ApiError.badRequest('The default rule must stay published')
  validateRuleShape(data)
  const path = assertPathInProgramme(data.pathId, data.programme)

  const before = {
    name: existing.name,
    path: existingPath,
    priority: existing.priority,
    status: existing.status,
    summary: existing.summary,
    conditions: structuredClone(existing.conditions),
  }
  updateRow(existing, {
    name: data.name,
    summary: data.summary,
    pathId: data.pathId,
    conditions: data.conditions as RuleGroup,
    priority: data.priority,
    status: data.status,
  })
  audit({
    action: 'rule.update',
    objectType: 'assignment_rule',
    objectId: existing.code,
    before,
    after: {
      name: data.name,
      path: path.code,
      priority: data.priority,
      status: data.status,
      summary: data.summary,
      conditions: data.conditions,
    },
  })
  commit()
  return { id: ruleId, code: existing.code }
}

// ---------------------------------------------------------------------------------------------
// Profiles and preview
// ---------------------------------------------------------------------------------------------

function learnerProfile(learnerCode: string) {
  const profile = db.profiles.find((p) => p.learnerCode === learnerCode)
  if (!profile) throw ApiError.notFound(`No learner with ID ${learnerCode}`)
  const organisation = profile.organisationId
    ? db.organisations.find((o) => o.id === profile.organisationId)
    : undefined
  const row = {
    userId: profile.userId,
    learnerCode: profile.learnerCode,
    fullName: profile.fullName,
    organisationName: organisation?.name ?? null,
    organisationType: organisation?.type ?? null,
    jobTitle: profile.jobTitle,
    jobFunction: profile.jobFunction,
    seniority: profile.seniority,
    experience: profile.experience,
    goals: profile.goals,
    status: profile.status,
  }

  // Baseline weak competency: the lowest-scoring competency on the earliest pre-assessment.
  const preIds = new Set(db.assessments.filter((a) => a.kind === 'pre').map((a) => a.id))
  const [pre] = db.assessmentAttempts
    .filter((a) => a.learnerId === profile.userId && preIds.has(a.assessmentId))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  let weak: string | null = null
  const scores = pre?.competencyScores
  if (scores) {
    weak = [...COMPETENCIES].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0))[0] ?? null
  }

  const ruleProfile: RuleProfile = {
    organisationType: row.organisationType,
    organisation: row.organisationName,
    jobFunction: row.jobFunction,
    jobTitle: row.jobTitle,
    seniority: row.seniority,
    experience: row.experience,
    goals: (row.goals ?? []) as RuleProfile['goals'],
    baselineWeakCompetency: weak,
    complete: row.status === 'complete',
  }
  return { row, ruleProfile }
}

function learnerEnrolments(userId: string) {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const paths = indexBy(db.learningPaths, (p) => p.id)
  const versions = indexBy(db.pathVersions, (v) => v.id)
  return db.enrolments
    .filter((e) => e.learnerId === userId)
    .map((e) => {
      const path = e.pathId ? paths.get(e.pathId) : undefined
      return {
        id: e.id,
        programme: programmes.get(e.programmeId)?.code ?? 'A',
        status: e.status,
        pathId: e.pathId,
        pathName: path?.name ?? null,
        pathCode: path?.code ?? null,
        version: e.pathVersionId ? (versions.get(e.pathVersionId)?.version ?? null) : null,
        assignmentReason: e.assignmentReason,
        overrideReason: e.overrideReason,
      }
    })
    .sort((a, b) => a.programme.localeCompare(b.programme))
}

function savedRules(programme: ProgrammeCode): PreviewRule[] {
  const programmeId = db.programmes.find((p) => p.code === programme)?.id
  return db.assignmentRules
    .filter((r) => r.programmeId === programmeId && r.status !== 'archived')
    .sort((a, b) => b.priority - a.priority)
    .map((r) => ({
      id: r.id,
      name: r.name,
      pathId: r.pathId,
      priority: r.priority,
      isDefault: r.isDefault,
      conditions: structuredClone(r.conditions) as PreviewRule['conditions'],
      summary: r.summary,
      status: r.status,
      programme,
    }))
}

/**
 * Evaluates a rule set against one learner. Saved rules: only published rules take part.
 * An unsaved set (the editor's what-if) takes part in full, except archived rules.
 */
export async function previewMatch(input: z.input<typeof matchPreviewInput>) {
  await delay()
  requireRole('admin')
  const data: MatchPreviewInput = parseInput(matchPreviewInput, input)
  const { row, ruleProfile } = learnerProfile(data.learnerCode)
  const all = data.rules ?? savedRules(data.programme)
  const active = all.filter((rule) =>
    data.rules ? rule.status !== 'archived' : rule.status === 'published',
  )
  const pathNames = indexBy(db.learningPaths, (p) => p.id)

  const defs: RuleDefinition[] = active.map((rule, index) => ({
    code: rule.id ?? `unsaved-${index}`,
    name: rule.name,
    programme: data.programme,
    pathCode: rule.pathId,
    priority: rule.priority,
    isDefault: rule.isDefault,
    conditions: rule.conditions as RuleGroup,
    summary: rule.summary,
    variation: '',
  }))
  if (!defs.some((d) => d.isDefault))
    throw ApiError.badRequest('The programme needs a published default rule')
  const resolution = resolvePathRule(data.programme, ruleProfile, defs)
  const winnerPath = pathNames.get(resolution.rule.pathCode)

  return out({
    learner: {
      learnerCode: row.learnerCode,
      fullName: row.fullName,
      profileStatus: row.status,
      enrolments: learnerEnrolments(row.userId),
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
  })
}

const KIND_ASSESSMENT = {
  assessment_pre: 'pre',
  assessment_post: 'post',
  assessment_formative: 'formative',
} as const

/** The path as a learner would see it: items in order, with this learner's progress. */
export async function getExperience(
  pathId: string,
  query: Partial<z.input<typeof experienceQuery>> = {},
) {
  await delay()
  requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  const { learnerCode, versionId } = parseInput(experienceQuery, query, 'query')
  const detail = pathDetail(pathId)
  const version =
    (versionId && detail.versions.find((v) => v.id === versionId)) ||
    detail.versions.find((v) => v.status === 'draft') ||
    detail.versions.find((v) => v.isCurrent) ||
    detail.versions[0]
  if (!version) throw ApiError.notFound('This path has no versions')
  const { row } = learnerProfile(learnerCode)

  const programmeId = db.programmes.find((p) => p.code === detail.path.programme)?.id
  const enrolment = db.enrolments.find(
    (e) => e.learnerId === row.userId && e.programmeId === programmeId,
  )

  const progress = new Map<string, { status: string; percent: number }>()
  const attempts = new Map<string, number>()
  let practised = false
  let submission: string | null = null
  if (enrolment) {
    const kinds = indexBy(db.assessments, (a) => a.id)
    for (const u of db.unitProgress) {
      if (u.enrolmentId === enrolment.id)
        progress.set(u.courseId, { status: u.status, percent: u.percent })
    }
    for (const t of db.assessmentAttempts) {
      const kind = kinds.get(t.assessmentId)?.kind
      if (t.enrolmentId === enrolment.id && t.status === 'submitted' && t.score !== null && kind)
        attempts.set(kind, t.score)
    }
    practised = db.rolePlayAttempts.some((p) => p.enrolmentId === enrolment.id)
    const [latest] = db.submissions
      .filter((s) => s.enrolmentId === enrolment.id)
      .sort((a, b) => b.version - a.version)
    submission = latest?.status ?? null
  }

  const items = version.items.map((item) => {
    let state: 'completed' | 'in_progress' | 'not_started' = 'not_started'
    let detailText: string | null = null
    if ((item.kind === 'course' || item.kind === 'session') && item.courseId) {
      const p = progress.get(item.courseId)
      if (p) {
        state = p.status as typeof state
        detailText = p.status === 'in_progress' ? `${p.percent}% complete` : null
      }
    } else if (item.kind in KIND_ASSESSMENT) {
      const score = attempts.get(KIND_ASSESSMENT[item.kind as keyof typeof KIND_ASSESSMENT])
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

  return out({
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
  })
}

/** Manual path override with a reason (brief §14), audited as enrolment.path_override. */
export async function overridePath(input: z.input<typeof overrideInput>) {
  await delay()
  const viewer = requireRole('admin')
  const data = parseInput(overrideInput, input)
  const enrolment = findOr404(
    db.enrolments,
    (e) => e.id === data.enrolmentId,
    'Enrolment not found',
  )
  const programme = db.programmes.find((p) => p.id === enrolment.programmeId)?.code
  const learnerCode = db.profiles.find((p) => p.userId === enrolment.learnerId)?.learnerCode
  const currentPath = enrolment.pathId
    ? (db.learningPaths.find((p) => p.id === enrolment.pathId)?.code ?? null)
    : null
  const target = pathRow(data.pathId)
  if (target.programme !== programme)
    throw ApiError.badRequest('The new path must belong to the same programme')
  if (!target.currentVersionId) throw ApiError.badRequest('Publish the path before assigning it')
  if (enrolment.pathId === data.pathId)
    throw ApiError.badRequest('The learner is already on this path')

  updateRow(enrolment, {
    pathId: data.pathId,
    pathVersionId: target.currentVersionId,
    overrideReason: data.reason,
    overriddenBy: viewer.id,
    assignmentReason: `Administrator override: ${target.name}`,
  })
  audit({
    action: 'enrolment.path_override',
    objectType: 'enrolment',
    objectId: data.enrolmentId,
    before: { learner: learnerCode, path: currentPath },
    after: { learner: learnerCode, path: target.code },
    reason: data.reason,
  })
  commit()
  return { enrolmentId: data.enrolmentId, path: target.code }
}

export type MatchPreview = Awaited<ReturnType<typeof previewMatch>>
export type Experience = Awaited<ReturnType<typeof getExperience>>
