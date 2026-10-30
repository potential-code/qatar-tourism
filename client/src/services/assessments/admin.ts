import {
  COMPETENCIES,
  CONTENT_LANGUAGES,
  FEEDBACK_RELEASES,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  SCORE_POLICIES,
} from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import type { AssessmentAttemptRow, AssessmentRuleRow, QuestionBankRow } from '@shared/types/db'
import { learnerDisplayId } from '@shared/utils/identity'
import { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  nowIso,
  out,
  parseInput,
  requireCapability,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'
import { notify } from '../notifications.service'
import {
  programmeOfEnrolment,
  settleAllExpired,
  snapshotQuestions,
  wasAutoSubmitted,
} from './attempts'
import { activeRows, drawItems, optionOrderFor, pickVariant, poolSize } from './draw'
import { activeRule, allowance, countedScore, grantsFor, ruleById } from './rules'

/**
 * Academy Management, Assessments (SPEC §6): question banks with versions, the rule builder with
 * a preview, and the attempts list with per-attempt snapshots and extra-attempt grants. Admin only.
 * Every change is audited. Thresholds are demonstration settings, not confirmed policy.
 */

const SHORT: Record<string, string> = {
  discover_needs: 'DN',
  verify_information: 'VI',
  communicate_clearly: 'CC',
  recover_service: 'RS',
  protect_information: 'PI',
}

// --- Question banks ------------------------------------------------------------------------

export async function listQuestions() {
  await delay()
  requireRole('admin')
  const usage = new Map<string, number>()
  for (const attempt of db.assessmentAttempts) {
    for (const item of attempt.snapshot?.items ?? []) {
      const key = `${item.questionId}@${item.version}`
      usage.set(key, (usage.get(key) ?? 0) + 1)
    }
  }
  const newest = new Map<string, number>()
  for (const q of db.questionBank) {
    newest.set(q.questionId, Math.max(newest.get(q.questionId) ?? 0, q.version))
  }
  const live = new Set(activeRows(db.questionBank).map((q) => q.id))
  const items = [...db.questionBank]
    .sort(
      (a, b) =>
        a.competency.localeCompare(b.competency) ||
        a.sharedId.localeCompare(b.sharedId) ||
        a.language.localeCompare(b.language) ||
        b.version - a.version,
    )
    .map((q) => ({
      ...q,
      isLatest: q.version === newest.get(q.questionId),
      isLive: live.has(q.id),
      attemptsUsing: usage.get(`${q.questionId}@${q.version}`) ?? 0,
    }))
  return out({
    items,
    summary: {
      shared: new Set(db.questionBank.map((q) => q.sharedId)).size,
      published: live.size,
      drafts: db.questionBank.filter((q) => q.status === 'draft').length,
    },
  })
}

export type QuestionListItem = Awaited<ReturnType<typeof listQuestions>>['items'][number]

const optionSchema = z.object({
  key: z.string().trim().min(1).max(2),
  text: z.string().trim().min(1, 'Every option needs text').max(300),
})

const questionInput = z
  .object({
    /** The row being edited. Absent when creating. */
    id: z.string().optional(),
    /** Link a new variant to an existing shared question (for example, add the Arabic version). */
    sharedId: z.string().optional(),
    competency: z.enum(COMPETENCIES),
    programme: z.enum(['A', 'B', 'all']),
    difficulty: z.enum(QUESTION_DIFFICULTIES),
    language: z.enum(CONTENT_LANGUAGES),
    type: z.enum(QUESTION_TYPES),
    prompt: z.string().trim().min(10, 'Write the question (at least 10 characters)').max(600),
    options: z.array(optionSchema).min(2, 'Add at least two options').max(6),
    correct: z.array(z.string()).min(1, 'Mark the correct answer'),
    feedback: z.string().trim().min(5, 'Add feedback for the learner').max(600),
    points: z.number().int().min(1).max(10),
    publish: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const keys = new Set(value.options.map((o) => o.key))
    if (keys.size !== value.options.length) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Option keys must be unique' })
    }
    if (value.correct.some((k) => !keys.has(k))) {
      ctx.addIssue({
        code: 'custom',
        path: ['correct'],
        message: 'The correct answer must be one of the options',
      })
    }
    if (value.type !== 'multiple' && value.correct.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['correct'],
        message: 'Choose exactly one correct option',
      })
    }
    if (value.type === 'multiple' && value.correct.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['correct'],
        message: 'A multiple-choice question has at least two correct options',
      })
    }
  })

export type QuestionInput = z.input<typeof questionInput>

function nextCode(competency: string): string {
  const prefix = `QS-${SHORT[competency]}-`
  const highest = Math.max(
    0,
    ...db.questionBank
      .filter((q) => q.sharedId.startsWith(prefix))
      .map((q) => Number(q.sharedId.slice(prefix.length)) || 0),
  )
  return `${SHORT[competency]}-${String(highest + 1).padStart(3, '0')}`
}

const summarise = (q: QuestionBankRow) => ({
  questionId: q.questionId,
  version: q.version,
  status: q.status,
  difficulty: q.difficulty,
  points: q.points,
})

/**
 * Creates a question, or edits one. A published question is never changed in place: the edit
 * becomes the next version (a draft until published), so attempts that drew version N keep it.
 */
export async function saveQuestion(input: QuestionInput) {
  await delay()
  requireRole('admin')
  const data = parseInput(questionInput, input)
  const fields = {
    competency: data.competency,
    programme: data.programme,
    difficulty: data.difficulty,
    language: data.language,
    type: data.type,
    prompt: data.prompt,
    options: data.options.map((o) => ({ key: o.key, text: o.text })),
    correct: [...data.correct].sort(),
    feedback: data.feedback,
    points: data.points,
  }
  let row: QuestionBankRow
  if (data.id) {
    const current = db.questionBank.find((q) => q.id === data.id)
    if (!current) throw ApiError.notFound('Question not found')
    const sameQuestion = db.questionBank.filter((q) => q.questionId === current.questionId)
    const latest = sameQuestion.reduce((a, b) => (b.version > a.version ? b : a))
    if (latest.status === 'draft') {
      row = updateRow(latest, { ...fields, language: current.language })
    } else {
      row = insertRow('questionBank', {
        ...fields,
        language: current.language,
        questionId: current.questionId,
        sharedId: current.sharedId,
        version: latest.version + 1,
        status: 'draft',
      })
    }
    audit({
      action: 'assessment.question.edit',
      objectType: 'question',
      objectId: row.questionId,
      before: summarise(current),
      after: summarise(row),
      reason: row.version > current.version ? 'Edit created a new version' : 'Draft updated',
    })
  } else {
    const sharedId = data.sharedId ?? `QS-${nextCode(data.competency)}`
    const code = sharedId.replace(/^QS-/, '')
    const questionId = `Q-${code}-${data.language.toUpperCase()}`
    if (db.questionBank.some((q) => q.questionId === questionId)) {
      throw ApiError.badRequest(
        `A ${data.language === 'ar' ? 'Arabic' : 'English'} variant of this question already exists`,
      )
    }
    row = insertRow('questionBank', {
      ...fields,
      questionId,
      sharedId,
      version: 1,
      status: 'draft',
    })
    audit({
      action: 'assessment.question.create',
      objectType: 'question',
      objectId: row.questionId,
      after: summarise(row),
    })
  }
  if (data.publish) publishRow(row)
  commit()
  return out({ id: row.id, questionId: row.questionId, version: row.version, status: row.status })
}

function publishRow(row: QuestionBankRow) {
  if (row.status === 'published') return
  const before = summarise(row)
  updateRow(row, { status: 'published' })
  audit({
    action: 'assessment.question.publish',
    objectType: 'question',
    objectId: row.questionId,
    before,
    after: summarise(row),
    reason: `Version ${row.version} is now used for new attempts`,
  })
}

export async function publishQuestion(id: string) {
  await delay()
  requireRole('admin')
  const row = db.questionBank.find((q) => q.id === id)
  if (!row) throw ApiError.notFound('Question not found')
  if (row.status === 'published') throw ApiError.badRequest('This version is already published')
  publishRow(row)
  commit()
  return out({ id: row.id, questionId: row.questionId, version: row.version, status: row.status })
}

// --- Rules and the builder -----------------------------------------------------------------

const drawSchema = z.object({
  competency: z.enum(COMPETENCIES),
  difficulty: z.enum([...QUESTION_DIFFICULTIES, 'any'] as const),
  count: z.number().int().min(1).max(10),
})

const ruleInput = z.object({
  programme: z.enum(['A', 'B']),
  kind: z.enum(['pre', 'post']),
  draws: z.array(drawSchema).min(1, 'Draw at least one question'),
  randomiseQuestions: z.boolean(),
  randomiseOptions: z.boolean(),
  passPercent: z.number().int().min(1).max(100).nullable(),
  attemptLimit: z.number().int().min(1).max(10),
  timeLimitMinutes: z.number().int().min(1).max(240).nullable(),
  feedbackRelease: z.enum(FEEDBACK_RELEASES),
  scorePolicy: z.enum(SCORE_POLICIES),
})

export type RuleConfig = z.input<typeof ruleInput>

const configOf = (rule: AssessmentRuleRow): RuleConfig => ({
  programme: rule.programme,
  kind: rule.kind,
  draws: rule.draws.map((d) => ({ ...d })),
  randomiseQuestions: rule.randomiseQuestions,
  randomiseOptions: rule.randomiseOptions,
  passPercent: rule.passPercent,
  attemptLimit: rule.attemptLimit,
  timeLimitMinutes: rule.timeLimitMinutes,
  feedbackRelease: rule.feedbackRelease,
  scorePolicy: rule.scorePolicy,
})

export async function listRules() {
  await delay()
  requireRole('admin')
  const items = (['A', 'B'] as const).flatMap((programme) =>
    (['pre', 'post'] as const).flatMap((kind) => {
      const rule = activeRule(programme, kind)
      if (!rule) return []
      const history = db.assessmentRules
        .filter((r) => r.programme === programme && r.kind === kind)
        .sort((a, b) => b.version - a.version)
        .map((r) => ({ id: r.id, version: r.version, status: r.status, updatedAt: r.updatedAt }))
      return [
        { programme, kind, id: rule.id, version: rule.version, config: configOf(rule), history },
      ]
    }),
  )
  const questionsAvailable = COMPETENCIES.map((competency) => ({
    competency,
    label: COMPETENCY_LABELS[competency],
    byDifficulty: Object.fromEntries(
      QUESTION_DIFFICULTIES.map((d) => [
        d,
        poolSize(db.questionBank, 'A', { competency, difficulty: d }),
      ]),
    ) as Record<(typeof QUESTION_DIFFICULTIES)[number], number>,
  }))
  return out({ items, questionsAvailable })
}

function describeRule(config: z.infer<typeof ruleInput>, drawn: number): string[] {
  const lines: string[] = []
  const draws = config.draws
    .map(
      (d) =>
        `${d.count} ${d.difficulty === 'any' ? 'any-difficulty' : d.difficulty} from ${COMPETENCY_LABELS[d.competency]}`,
    )
    .join('; ')
  lines.push(
    `Draws ${drawn} question${drawn === 1 ? '' : 's'} from the published bank: ${draws}.`,
    config.randomiseQuestions
      ? 'Question order is random for every new attempt. Reloading the page resumes the same attempt.'
      : 'Questions appear in the order of the draw rules.',
    config.randomiseOptions
      ? 'Answer options are shuffled for every new attempt.'
      : 'Answer options keep their authored order.',
    config.passPercent === null
      ? 'No pass mark: the attempt is recorded as a baseline and nothing is gated.'
      : `Pass mark ${config.passPercent} percent of the available points.`,
    `${config.attemptLimit} attempt${config.attemptLimit === 1 ? '' : 's'} allowed; after that the learner sees "Attempt limit reached — request support" until an authorised administrator grants one extra attempt.`,
    config.scorePolicy === 'best' ? 'The best score counts.' : 'The latest score counts.',
    config.timeLimitMinutes === null
      ? 'No time limit.'
      : `${config.timeLimitMinutes} minute time limit; when it ends the answers saved so far are submitted automatically.`,
    {
      immediate: 'Feedback is released as soon as the attempt is submitted.',
      after_submission: 'Feedback is released after the attempt is submitted.',
      after_pass: 'Feedback is released only once the learner has passed.',
    }[config.feedbackRelease],
  )
  return lines
}

/** A trial draw with the draft rule, plus the rule in words. Nothing is saved. */
export async function previewRule(input: RuleConfig, language: 'en' | 'ar' = 'en') {
  await delay()
  requireRole('admin')
  const config = parseInput(ruleInput, input)
  const drawn = drawItems({
    bank: db.questionBank,
    programme: config.programme,
    draws: config.draws,
    randomiseQuestions: config.randomiseQuestions,
    seed: `preview:${nowIso()}:${Math.random()}`,
  })
  const selected = drawn.items.flatMap((item, index) => {
    const row = pickVariant(item, language)
    if (!row) return []
    return [
      {
        position: index + 1,
        questionId: row.questionId,
        sharedId: row.sharedId,
        competency: row.competency,
        difficulty: row.difficulty,
        type: row.type,
        points: row.points,
        language: row.language,
        prompt: row.prompt,
        options: optionOrderFor(row, `preview:${row.questionId}`, config.randomiseOptions).map(
          (key) => row.options.find((o) => o.key === key)?.text ?? key,
        ),
      },
    ]
  })
  const pools = config.draws.map((d) => ({
    ...d,
    available: poolSize(db.questionBank, config.programme, d),
  }))
  return out({
    selected,
    totalPoints: selected.reduce((sum, q) => sum + q.points, 0),
    pools,
    shortfalls: drawn.shortfalls.map((s) => ({
      competency: s.rule.competency,
      difficulty: s.rule.difficulty,
      requested: s.rule.count,
      available: s.available,
    })),
    explanation: describeRule(config, selected.length),
  })
}

/** Publishes the configuration as the next version of the rule. New attempts use it at once. */
export async function publishRule(input: RuleConfig, reason: string) {
  await delay()
  requireRole('admin')
  const config = parseInput(ruleInput, input)
  const note = reason.trim()
  if (note.length < 5) throw ApiError.badRequest('Give a short reason for this version')
  if (config.kind === 'pre' && config.passPercent !== null) {
    throw ApiError.badRequest('The pre-assessment is a baseline and has no pass mark')
  }
  const merged = new Map<string, number>()
  for (const d of config.draws) {
    const key = `${d.competency}:${d.difficulty}`
    merged.set(key, (merged.get(key) ?? 0) + d.count)
  }
  const short = config.draws
    .map((d) => ({ d, available: poolSize(db.questionBank, config.programme, d) }))
    .filter(({ d, available }) => (merged.get(`${d.competency}:${d.difficulty}`) ?? 0) > available)
  if (short.length > 0) {
    throw ApiError.badRequest('The bank does not have enough published questions for this draw', {
      shortfalls: short.map(({ d, available }) => ({ ...d, available })),
    })
  }
  const current = activeRule(config.programme, config.kind)
  const assessment = db.assessments.find((a) => a.kind === config.kind)
  if (!assessment) throw ApiError.notFound('Assessment not found')
  const version =
    Math.max(
      0,
      ...db.assessmentRules
        .filter((r) => r.programme === config.programme && r.kind === config.kind)
        .map((r) => r.version),
    ) + 1
  const row = insertRow('assessmentRules', {
    ...config,
    draws: config.draws.map((d) => ({ ...d })),
    drawCount: config.draws.reduce((sum, d) => sum + d.count, 0),
    assessmentId: assessment.id,
    version,
    status: 'published',
  })
  if (config.kind === 'post' && config.programme === 'A') {
    updateRow(assessment, { passPercent: config.passPercent })
  }
  audit({
    action: 'assessment.rule.publish',
    objectType: 'assessment_rule',
    objectId: `${config.kind}:${config.programme}:v${version}`,
    before: current ? { version: current.version, ...summariseRule(current) } : null,
    after: { version, ...summariseRule(row) },
    reason: note,
  })
  commit()
  return out({ id: row.id, version })
}

const summariseRule = (r: AssessmentRuleRow) => ({
  drawCount: r.drawCount,
  passPercent: r.passPercent,
  attemptLimit: r.attemptLimit,
  timeLimitMinutes: r.timeLimitMinutes,
  scorePolicy: r.scorePolicy,
  feedbackRelease: r.feedbackRelease,
})

// --- Attempts ------------------------------------------------------------------------------

const attemptFilter = z.object({
  search: z.string().trim().max(100).optional(),
  programme: z.enum(['A', 'B']).optional(),
  kind: z.enum(['pre', 'post']).optional(),
  outcome: z.enum(['passed', 'not_passed', 'in_progress', 'baseline']).optional(),
  language: z.enum(CONTENT_LANGUAGES).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(5).max(100).default(25),
})

export type AttemptFilter = z.input<typeof attemptFilter>

function outcomeOf(row: AssessmentAttemptRow, pass: number | null) {
  if (row.status === 'in_progress') return 'in_progress' as const
  if (pass === null) return 'baseline' as const
  return (row.score ?? 0) >= pass ? ('passed' as const) : ('not_passed' as const)
}

function attemptContext(row: AssessmentAttemptRow) {
  const assessment = db.assessments.find((a) => a.id === row.assessmentId)
  const kind = assessment?.kind ?? 'pre'
  const programme = programmeOfEnrolment(row.enrolmentId)
  const rule =
    ruleById(row.ruleId) ??
    (programme === 'C' || kind === 'formative' ? null : activeRule(programme, kind))
  const pass = row.ruleId ? (rule?.passPercent ?? null) : (assessment?.passPercent ?? null)
  return { assessment, kind, programme, rule, pass }
}

export async function listAttempts(input: AttemptFilter = {}) {
  await delay()
  requireRole('admin')
  settleAllExpired()
  const filter = parseInput(attemptFilter, input)
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const needle = filter.search?.toLowerCase()
  const rows = db.assessmentAttempts.flatMap((row) => {
    const { kind, programme, rule, pass } = attemptContext(row)
    if (kind === 'formative' || programme === 'C') return []
    const profile = profiles.get(row.learnerId)
    const language = row.snapshot?.items[0]?.language ?? 'en'
    const outcome = outcomeOf(row, pass)
    if (filter.programme && programme !== filter.programme) return []
    if (filter.kind && kind !== filter.kind) return []
    if (filter.outcome && outcome !== filter.outcome) return []
    if (filter.language && language !== filter.language) return []
    if (
      needle &&
      !`${profile?.fullName ?? ''} ${profile?.learnerCode ?? ''} ${learnerDisplayId(profile?.learnerCode ?? '')}`
        .toLowerCase()
        .includes(needle)
    )
      return []
    return [
      {
        id: row.id,
        learnerId: row.learnerId,
        learnerName: profile?.fullName ?? 'Unknown learner',
        displayId: profile ? learnerDisplayId(profile.learnerCode) : '',
        programme,
        kind,
        attemptNo: row.attemptNo,
        status: row.status,
        outcome,
        score: row.score,
        passMark: pass,
        language,
        ruleVersion: row.ruleVersion,
        usesSnapshot: row.snapshot !== null,
        startedAt: row.startedAt,
        submittedAt: row.submittedAt,
        autoSubmitted: wasAutoSubmitted(row),
        scorePolicy: rule?.scorePolicy ?? null,
      },
    ]
  })
  rows.sort((a, b) => (b.submittedAt ?? b.startedAt).localeCompare(a.submittedAt ?? a.startedAt))
  const total = rows.length
  const start = (filter.page - 1) * filter.pageSize
  return out({
    items: rows.slice(start, start + filter.pageSize),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    extraAttemptsGranted: db.attemptGrants.length,
  })
}

export type AttemptListItem = Awaited<ReturnType<typeof listAttempts>>['items'][number]

export async function getAttemptDetail(attemptId: string) {
  await delay()
  requireRole('admin')
  settleAllExpired()
  const row = db.assessmentAttempts.find((a) => a.id === attemptId)
  if (!row) throw ApiError.notFound('Attempt not found')
  const { assessment, kind, programme, rule, pass } = attemptContext(row)
  const profile = db.profiles.find((p) => p.userId === row.learnerId)
  const rows = db.assessmentAttempts.filter(
    (a) => a.enrolmentId === row.enrolmentId && a.assessmentId === row.assessmentId,
  )
  const policy = rule?.scorePolicy ?? 'best'
  const counted = countedScore(policy, rows)
  const passed = pass !== null && counted !== null && counted >= pass
  const live = programme !== 'C' && kind !== 'formative' ? activeRule(programme, kind) : null
  const allow = live ? allowance(live, row.enrolmentId, row.assessmentId) : null
  const selections = new Map(
    db.assessmentAnswers
      .filter((a) => a.attemptId === row.id && a.questionId)
      .map((a) => [a.questionId as string, a.selectedOption.split(',').filter(Boolean)]),
  )
  const questions = snapshotQuestions(row).map(({ item, question }) => {
    const selected = selections.get(question.questionId) ?? []
    const text = new Map(question.options.map((o) => [o.key, o.text]))
    return {
      questionId: question.questionId,
      sharedId: question.sharedId,
      version: question.version,
      language: item.language,
      competency: question.competency,
      difficulty: question.difficulty,
      type: question.type,
      points: question.points,
      prompt: question.prompt,
      options: item.optionOrder.map((key) => ({ key, text: text.get(key) ?? key })),
      correct: question.correct,
      selected,
      isCorrect:
        selected.length > 0 &&
        selected.length === question.correct.length &&
        selected.every((k) => question.correct.includes(k)),
      feedback: question.feedback,
    }
  })
  const grants = grantsFor(row.enrolmentId, row.assessmentId).map((g) => ({
    id: g.id,
    reason: g.reason,
    grantedAt: g.grantedAt,
    grantedBy: db.users.find((u) => u.id === g.grantedBy)?.name ?? 'Administrator',
    used: g.consumedByAttemptId !== null,
  }))
  const grantIds = new Set(grants.map((g) => g.id))
  const trail = db.auditEvents
    .filter(
      (e) =>
        e.action.startsWith('assessment.') &&
        e.objectId !== null &&
        (e.objectId === row.id || grantIds.has(e.objectId)),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((e) => ({
      id: e.id,
      action: e.action,
      actor: e.actorLabel ?? e.actorRole,
      at: e.createdAt,
      reason: e.reason,
    }))
  return out({
    attempt: {
      id: row.id,
      attemptNo: row.attemptNo,
      status: row.status,
      score: row.score,
      startedAt: row.startedAt,
      submittedAt: row.submittedAt,
      deadlineAt: row.deadlineAt,
      autoSubmitted: wasAutoSubmitted(row),
      ruleVersion: row.ruleVersion,
      seed: row.snapshot?.seed ?? null,
      outcome: outcomeOf(row, pass),
      passMark: pass,
    },
    learner: {
      id: row.learnerId,
      name: profile?.fullName ?? 'Unknown learner',
      displayId: profile ? learnerDisplayId(profile.learnerCode) : '',
    },
    programme,
    kind,
    assessmentTitle: assessment?.title ?? '',
    questions,
    hasSnapshot: row.snapshot !== null,
    standing: {
      counted,
      scorePolicy: policy,
      passed,
      attemptLimit: allow?.limit ?? null,
      used: allow?.used ?? rows.length,
      remaining: allow?.remaining ?? null,
      extraGranted: allow?.granted ?? 0,
      canGrant:
        allow !== null &&
        allow.remaining === 0 &&
        !passed &&
        allow.unusedGrant === null &&
        row.status === 'submitted',
    },
    grants,
    trail,
  })
}

const grantInput = z.object({
  attemptId: z.string().min(1),
  reason: z.string().trim().min(5, 'Record the reason (at least 5 characters)').max(500),
})

/** One extra attempt for a learner who used all of theirs, with the reason recorded and audited. */
export async function grantExtraAttempt(input: z.input<typeof grantInput>) {
  await delay()
  const viewer = requireCapability('assessment.grant_attempt')
  const { attemptId, reason } = parseInput(grantInput, input)
  settleAllExpired()
  const row = db.assessmentAttempts.find((a) => a.id === attemptId)
  if (!row) throw ApiError.notFound('Attempt not found')
  const { kind, programme } = attemptContext(row)
  if (kind === 'formative' || programme === 'C') {
    throw ApiError.badRequest('Extra attempts apply to the pre and post assessments')
  }
  const rule = activeRule(programme, kind)
  if (!rule) throw ApiError.badRequest('No assessment rule is published')
  const rows = db.assessmentAttempts.filter(
    (a) => a.enrolmentId === row.enrolmentId && a.assessmentId === row.assessmentId,
  )
  const counted = countedScore(rule.scorePolicy, rows)
  if (rule.passPercent !== null && counted !== null && counted >= rule.passPercent) {
    throw ApiError.badRequest('The learner has already passed')
  }
  const allow = allowance(rule, row.enrolmentId, row.assessmentId)
  if (allow.remaining > 0 || allow.unusedGrant) {
    throw ApiError.badRequest('The learner still has an attempt available')
  }
  const grant = insertRow('attemptGrants', {
    assessmentId: row.assessmentId,
    enrolmentId: row.enrolmentId,
    learnerId: row.learnerId,
    grantedBy: viewer.id,
    reason,
    grantedAt: nowIso(),
  })
  audit({
    action: 'assessment.grant_attempt',
    objectType: 'assessment_grant',
    objectId: grant.id,
    before: { attemptsAllowed: allow.limit + allow.granted, attemptsUsed: allow.used },
    after: {
      attemptsAllowed: allow.limit + allow.granted + 1,
      learnerId: row.learnerId,
      programme,
      assessment: kind,
    },
    reason,
  })
  notify({
    eventId: `assessment-grant:${grant.id}`,
    kind: 'assessment_attempt_granted',
    recipientIds: [row.learnerId],
    subject: 'You have one more assessment attempt',
    body: `An administrator granted you one extra attempt for the ${kind === 'pre' ? 'baseline' : 'final'} assessment. You can start it from Assessments.`,
    actorId: viewer.id,
  })
  commit()
  return out({ grantId: grant.id, remaining: 1 })
}
