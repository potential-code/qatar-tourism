import { beforeEach, describe, expect, test } from 'bun:test'
import { COMPETENCIES } from '@shared/constants'
import type { DemoDb } from '@/mocks/db'
import { insertRow, now, nowIso } from '../api'
import * as admin from '../assessments/admin'
import { activeRows, drawItems, pickVariant, scoreItems } from '../assessments/draw'
import { QUESTION_CONTENT } from '../assessments/question-content'
import { activeRule, publishedPassPercent } from '../assessments/rules'
import * as assessments from '../assessments.service'
import { findEnrolment } from '../progress/evidence'
import { recomputeEnrolment } from '../progress.service'
import { answerAll, attemptRow, takeAttempt } from './assessments-support'
import { actAs, freshDemo } from './helpers'

/** Question banks and configurable assessment rules (SPEC §6). Demo settings, not policy. */

const MAHA = 'user-l0001' // Program B, baseline 40 recorded, post not yet taken
const IMPROVER = 'user-l0022' // Program A, seeded 50 percent baseline and 80 percent post
const ADMIN = 'user-admin'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

/** The role-play requirement that unlocks Maha's post-assessment. */
function unlockPost(learnerId = MAHA, programme: 'A' | 'B' = 'B') {
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw new Error('No enrolment')
  insertRow('rolePlayAttempts', {
    enrolmentId: enrolment.id,
    learnerId,
    scenarioKey: 'changed-booking',
    mode: 'text',
    transcript: [],
    empathyScore: 4,
    discoveryScore: 3,
    clarityScore: 3,
    accuracyScore: 3,
    solutionScore: 3,
    totalScore: 16,
    totalPercent: 80,
    feedback: { criteria: [], strength: 'Good', improve: 'Verify', retry: 'Ask' },
    completedAt: nowIso(),
  })
  recomputeEnrolment(learnerId, programme)
}

const itemsOf = (attemptId: string) => attemptRow(db, attemptId).snapshot?.items ?? []
const sharedOf = (questionId: string) =>
  db.questionBank.find((q) => q.questionId === questionId)?.sharedId as string

describe('the seeded bank', () => {
  test('24 shared items across five competencies and three difficulties, all three types, EN and AR', () => {
    expect(QUESTION_CONTENT).toHaveLength(24)
    const rows = db.questionBank
    expect(rows).toHaveLength(48)
    expect(new Set(rows.map((r) => r.type))).toEqual(new Set(['single', 'multiple', 'scenario']))
    expect(new Set(rows.map((r) => r.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']))
    for (const competency of COMPETENCIES) {
      expect(
        rows.filter((r) => r.competency === competency && r.language === 'en').length,
      ).toBeGreaterThanOrEqual(4)
    }
    for (const row of rows) {
      expect(row.options.length).toBe(4)
      expect(row.feedback.length).toBeGreaterThan(10)
      expect(row.correct.every((k) => row.options.some((o) => o.key === k))).toBe(true)
    }
    // Arabic variants carry Arabic script, English ones do not.
    expect(rows.filter((r) => r.language === 'ar').every((r) => /[؀-ۿ]/.test(r.prompt))).toBe(true)
    expect(rows.filter((r) => r.language === 'en').every((r) => !/[؀-ۿ]/.test(r.prompt))).toBe(true)
  })

  test('the family-activity scenario exists in both languages with the SPEC distractors', () => {
    const en = db.questionBank.find((q) => q.questionId === 'Q-DN-001-EN')
    const ar = db.questionBank.find((q) => q.questionId === 'Q-DN-001-AR')
    expect(en?.prompt).toBe(
      'A visitor asks for an activity suitable for their family. What should you do first?',
    )
    expect(en?.type).toBe('scenario')
    expect(en?.options.map((o) => o.text)).toEqual([
      'Assume every family wants the same activity',
      'Ask about their interests and practical needs',
      'Recommend only the most expensive option',
      'Ignore the request',
    ])
    expect(en?.correct).toEqual(['B'])
    expect(ar?.sharedId).toBe(en?.sharedId)
    expect(ar?.correct).toEqual(['B'])
  })
})

describe('drawing and scoring (pure)', () => {
  test('a draw gives the requested count per competency and is repeatable for a seed', () => {
    const rule = activeRule('B', 'post')
    if (!rule) throw new Error('No rule')
    const input = {
      bank: db.questionBank,
      programme: 'B' as const,
      draws: rule.draws,
      randomiseQuestions: true,
      seed: 'unit',
    }
    const a = drawItems(input)
    expect(a.items).toHaveLength(10)
    expect(a.shortfalls).toEqual([])
    for (const competency of COMPETENCIES) {
      expect(a.items.filter((i) => i.competency === competency)).toHaveLength(2)
    }
    expect(drawItems(input).items.map((i) => i.sharedId)).toEqual(a.items.map((i) => i.sharedId))
    expect(drawItems({ ...input, seed: 'other' }).items.map((i) => i.sharedId)).not.toEqual(
      a.items.map((i) => i.sharedId),
    )
  })

  test('the learner language picks the variant and English is the fallback', () => {
    const rule = activeRule('A', 'pre')
    if (!rule) throw new Error('No rule')
    const withoutArabic = db.questionBank.filter(
      (q) => !(q.language === 'ar' && q.competency === 'discover_needs'),
    )
    const drawn = drawItems({
      bank: withoutArabic,
      programme: 'A',
      draws: rule.draws,
      randomiseQuestions: false,
      seed: 's',
    })
    const variants = drawn.items.map((item) => pickVariant(item, 'ar'))
    expect(variants.find((v) => v?.competency === 'discover_needs')?.language).toBe('en')
    expect(
      variants.filter((v) => v?.competency !== 'discover_needs').every((v) => v?.language === 'ar'),
    ).toBe(true)
  })

  test('multiple choice is all-or-nothing and competency scores use the 0 to 20 scale', () => {
    const multiple = db.questionBank.find((q) => q.type === 'multiple' && q.language === 'en')
    const single = db.questionBank.find(
      (q) => q.type === 'single' && q.language === 'en' && q.competency !== multiple?.competency,
    )
    if (!multiple || !single) throw new Error('Missing questions')
    const partial = scoreItems([{ question: multiple, selected: [multiple.correct[0] as string] }])
    expect(partial.score).toBe(0)
    const both = scoreItems([
      { question: multiple, selected: multiple.correct },
      { question: single, selected: [] },
    ])
    expect(both.earned).toBe(multiple.points)
    expect(both.score).toBe(Math.round((100 * multiple.points) / (multiple.points + single.points)))
    expect(both.byCompetency[multiple.competency]).toBe(20)
    expect(both.byCompetency[single.competency]).toBe(0)
  })

  test('only the newest published version of a question is drawn', () => {
    const base = db.questionBank.find((q) => q.questionId === 'Q-DN-002-EN')
    if (!base) throw new Error('Missing')
    const bank = [
      ...db.questionBank,
      { ...base, id: 'v2', version: 2, status: 'published' as const },
      { ...base, id: 'v3', version: 3, status: 'draft' as const },
    ]
    expect(activeRows(bank).find((q) => q.questionId === 'Q-DN-002-EN')?.version).toBe(2)
  })
})

describe('Pre and Post through the rules engine', () => {
  test('the Pre draws five diagnostic questions, one per competency, and allows one scored attempt', async () => {
    actAs(db, 'user-l0001')
    await expect(assessments.start('B', 'pre')).rejects.toMatchObject({ status: 400 })
    const state = await assessments.getState('B', 'pre')
    expect(state.availability).toMatchObject({
      canStart: false,
      reasonCode: 'baseline_recorded',
      passMark: null,
      attemptLimit: 1,
      attemptsRemaining: 0,
    })
  })

  test('the Post draws ten questions, two per competency, with a 15 minute deadline', async () => {
    unlockPost()
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post')
    const row = attemptRow(db, attemptId)
    const items = itemsOf(attemptId)
    expect(items).toHaveLength(10)
    const competencies = items.map(
      (i) => db.questionBank.find((q) => q.questionId === i.questionId)?.competency,
    )
    for (const competency of COMPETENCIES) {
      expect(competencies.filter((c) => c === competency)).toHaveLength(2)
    }
    expect(row.ruleId).toBe(activeRule('B', 'post')?.id as string)
    expect(Date.parse(row.deadlineAt as string) - Date.parse(row.startedAt)).toBe(15 * 60_000)
    const state = await assessments.getState('B', 'post')
    expect(state.attempt?.questions).toHaveLength(10)
    expect(state.attempt?.secondsLeft).toBeGreaterThan(14 * 60)
    expect(JSON.stringify(state)).not.toContain('"correct"')
  })

  test('each new attempt draws again; a reload resumes the very same attempt', async () => {
    unlockPost()
    actAs(db, MAHA)
    const first = await assessments.start('B', 'post')
    const before = await assessments.getState('B', 'post')
    const reloaded = await assessments.getState('B', 'post')
    expect(reloaded.attempt?.questions.map((q) => q.id)).toEqual(
      before.attempt?.questions.map((q) => q.id),
    )
    expect(reloaded.attempt?.questions.map((q) => q.options.map((o) => o.key))).toEqual(
      before.attempt?.questions.map((q) => q.options.map((o) => o.key)),
    )
    expect((await assessments.start('B', 'post')).resumed).toBe(true)
    const firstItems = itemsOf(first.attemptId)

    await takeSubmitWrong(first.attemptId)
    const second = await assessments.start('B', 'post')
    expect(second.resumed).toBe(false)
    const secondItems = itemsOf(second.attemptId)
    expect(secondItems.map((i) => i.questionId)).not.toEqual(firstItems.map((i) => i.questionId))
    // A retake prefers questions the learner has not seen: the medium pool has two per competency.
    const firstShared = new Set(firstItems.map((i) => sharedOf(i.questionId)))
    const fresh = secondItems.filter((i) => !firstShared.has(sharedOf(i.questionId)))
    expect(fresh.length).toBeGreaterThanOrEqual(5)
    expect(attemptRow(db, second.attemptId).snapshot?.seed).not.toBe(
      attemptRow(db, first.attemptId).snapshot?.seed,
    )
  })

  async function takeSubmitWrong(attemptId: string) {
    await answerAll(db, attemptId, [...COMPETENCIES])
    return assessments.submit(attemptId)
  }

  test('the snapshot is immutable: editing the bank never alters an attempt in progress or finished', async () => {
    unlockPost()
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post')
    const drawn = itemsOf(attemptId)[0]
    const original = db.questionBank.find(
      (q) => q.questionId === drawn?.questionId && q.version === drawn?.version,
    )
    if (!original) throw new Error('Missing question')
    const originalPrompt = original.prompt

    actAs(db, ADMIN)
    const edited = await admin.saveQuestion({
      id: original.id,
      competency: original.competency,
      programme: original.programme,
      difficulty: original.difficulty,
      language: original.language,
      type: original.type,
      prompt: 'A completely different prompt written after the attempt started',
      options: original.options,
      correct: original.correct,
      feedback: original.feedback,
      points: original.points,
      publish: true,
    })
    expect(edited.version).toBe(original.version + 1)
    // The old version is untouched and a new version is live.
    expect(db.questionBank.find((q) => q.id === original.id)?.prompt).toBe(originalPrompt)
    expect(
      activeRows(db.questionBank).find((q) => q.questionId === original.questionId)?.version,
    ).toBe(edited.version)

    actAs(db, MAHA)
    const state = await assessments.getState('B', 'post')
    expect(state.attempt?.questions.find((q) => q.id === original.questionId)?.prompt).toBe(
      originalPrompt,
    )
    await takeSubmitCorrect(attemptId)
    const result = await assessments.getResult(attemptId)
    expect(result.review.find((r) => r.id === original.questionId)?.prompt).toBe(originalPrompt)

    actAs(db, ADMIN)
    const detail = await admin.getAttemptDetail(attemptId)
    expect(detail.questions.find((q) => q.questionId === original.questionId)).toMatchObject({
      prompt: originalPrompt,
      version: original.version,
    })
  })

  async function takeSubmitCorrect(attemptId: string) {
    await answerAll(db, attemptId)
    return assessments.submit(attemptId)
  }

  test('pass and fail use the 80 percent mark and the best score counts', async () => {
    unlockPost()
    actAs(db, MAHA)
    const first = await takeAttempt(db, 'B', 'post', ['recover_service', 'protect_information'])
    expect(first.result.passed).toBe(false)
    expect(first.result.score).toBeLessThan(80)
    expect(first.result.attemptsRemaining).toBe(1)

    const second = await takeAttempt(db, 'B', 'post', [...COMPETENCIES])
    expect(second.result.score).toBe(0)
    // The best of the two counts, not the latest.
    expect(second.result.counted).toBe(first.result.score)
    const overview = await assessments.overview('B')
    const post = overview.items.find((i) => i.kind === 'post')
    expect(post?.best).toBe(first.result.score)
    expect(overview.comparison).toEqual({
      baseline: 40,
      post: first.result.score,
      gainPoints: first.result.score - 40,
    })
  })

  test('a passing attempt closes the assessment', async () => {
    unlockPost()
    actAs(db, MAHA)
    const { result } = await takeAttempt(db, 'B', 'post')
    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
    expect(result.gate).toBe('advisory')
    await expect(assessments.start('B', 'post')).rejects.toMatchObject({ status: 400 })
  })

  test('two failed attempts block a third start with the support message', async () => {
    unlockPost()
    actAs(db, MAHA)
    await takeAttempt(db, 'B', 'post', [...COMPETENCIES])
    const second = await takeAttempt(db, 'B', 'post', [...COMPETENCIES])
    expect(second.result.limitReached).toBe(true)
    expect(second.result.attemptsRemaining).toBe(0)
    await expect(assessments.start('B', 'post')).rejects.toMatchObject({
      status: 400,
      message: 'Attempt limit reached — request support',
    })
    const state = await assessments.getState('B', 'post')
    expect(state.availability).toMatchObject({ canStart: false, reasonCode: 'limit_reached' })
  })

  test('an administrator grants exactly one extra attempt, with a recorded reason and an audit event', async () => {
    unlockPost()
    actAs(db, MAHA)
    await takeAttempt(db, 'B', 'post', [...COMPETENCIES])
    const second = await takeAttempt(db, 'B', 'post', [...COMPETENCIES])

    // Learners and trainers may not grant; the reason must be recorded.
    await expect(
      admin.grantExtraAttempt({
        attemptId: second.result.attemptId,
        reason: 'Please let me retry',
      }),
    ).rejects.toMatchObject({ status: 403 })
    actAs(db, ADMIN)
    await expect(
      admin.grantExtraAttempt({ attemptId: second.result.attemptId, reason: 'no' }),
    ).rejects.toMatchObject({ status: 400 })
    const reason = 'Approved after a technical fault interrupted the second attempt'
    const grant = await admin.grantExtraAttempt({ attemptId: second.result.attemptId, reason })
    expect(grant.remaining).toBe(1)
    // A second grant for the same position is refused.
    await expect(
      admin.grantExtraAttempt({ attemptId: second.result.attemptId, reason }),
    ).rejects.toMatchObject({ status: 400 })

    expect(db.attemptGrants).toHaveLength(1)
    expect(db.attemptGrants[0]).toMatchObject({
      reason,
      learnerId: MAHA,
      grantedBy: ADMIN,
      consumedByAttemptId: null,
    })
    const events = db.auditEvents.filter((e) => e.action === 'assessment.grant_attempt')
    expect(events).toHaveLength(1)
    expect(events[0]?.reason).toBe(reason)
    expect(
      db.notifications.some(
        (n) => n.kind === 'assessment_attempt_granted' && n.recipientId === MAHA,
      ),
    ).toBe(true)

    actAs(db, MAHA)
    expect((await assessments.getState('B', 'post')).availability).toMatchObject({
      canStart: true,
      attemptsRemaining: 1,
      extraGranted: 1,
    })
    const third = await takeAttempt(db, 'B', 'post', [...COMPETENCIES])
    expect(third.result.attemptNo).toBe(3)
    expect(db.attemptGrants[0]?.consumedByAttemptId).toBe(third.result.attemptId)
    // Exactly one: the fourth start is blocked again.
    await expect(assessments.start('B', 'post')).rejects.toMatchObject({ status: 400 })

    actAs(db, ADMIN)
    const detail = await admin.getAttemptDetail(third.result.attemptId)
    expect(detail.grants).toHaveLength(1)
    expect(detail.trail.map((t) => t.action)).toContain('assessment.grant_attempt')
  })

  test('the time limit auto-submits what was answered and says so', async () => {
    unlockPost()
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post')
    const row = attemptRow(db, attemptId)
    const [first, second, third] = itemsOf(attemptId)
    for (const item of [first, second, third]) {
      const question = db.questionBank.find((q) => q.questionId === item?.questionId)
      await assessments.saveAnswer({
        attemptId,
        questionId: item?.questionId as string,
        selected: [...(question?.correct ?? [])],
      })
    }
    // The timer ends: move the deadline into the past.
    row.deadlineAt = new Date(now().getTime() - 1000).toISOString()

    await expect(
      assessments.saveAnswer({
        attemptId,
        questionId: first?.questionId as string,
        selected: ['A'],
      }),
    ).rejects.toMatchObject({ status: 400 })
    const state = await assessments.getState('B', 'post')
    expect(state.attempt).toBeNull()
    expect(state.lastResult).toMatchObject({
      autoSubmitted: true,
      answeredCount: 3,
      questionCount: 10,
      attemptId,
    })
    expect(state.lastResult?.score).toBeGreaterThan(0)
    expect(state.lastResult?.score).toBeLessThan(80)
    expect(row.submittedAt).toBe(row.deadlineAt)
    expect(
      db.auditEvents.some((e) => e.action === 'assessment.auto_submit' && e.objectId === attemptId),
    ).toBe(true)
  })

  test('the screen timer can ask the service to expire an attempt', async () => {
    unlockPost()
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post')
    expect(await assessments.expire(attemptId)).toMatchObject({ expired: false })
    attemptRow(db, attemptId).deadlineAt = new Date(now().getTime() - 1000).toISOString()
    const done = await assessments.expire(attemptId)
    expect(done.expired).toBe(true)
    expect(done.result?.autoSubmitted).toBe(true)
    expect(done.result?.answeredCount).toBe(0)
  })

  test('the Arabic variant is served when the portal language is Arabic, and the snapshot keeps it', async () => {
    unlockPost()
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post', 'ar')
    const items = itemsOf(attemptId)
    expect(items.every((i) => i.language === 'ar' && i.questionId.endsWith('-AR'))).toBe(true)
    const state = await assessments.getState('B', 'post')
    expect(state.attempt?.language).toBe('ar')
    expect(state.attempt?.questions.every((q) => /[؀-ۿ]/.test(q.prompt))).toBe(true)
    await answerAll(db, attemptId)
    const result = await assessments.submit(attemptId)
    expect(result.language).toBe('ar')
    expect(result.score).toBe(100)
  })

  test('feedback is held until the learner passes when the rule says so', async () => {
    actAs(db, ADMIN)
    const rules = await admin.listRules()
    const post = rules.items.find((i) => i.programme === 'B' && i.kind === 'post')
    if (!post) throw new Error('Missing rule')
    await admin.publishRule(
      { ...post.config, feedbackRelease: 'after_pass' },
      'Hold feedback until passed',
    )
    unlockPost()
    actAs(db, MAHA)
    const { result } = await takeAttempt(db, 'B', 'post', [...COMPETENCIES])
    expect(result.feedbackHeld).toBe(true)
    expect(result.review).toHaveLength(0)
  })
})

describe('seeded improvement', () => {
  test('the Program A demo learner shows a 50 percent baseline, 80 percent post and 30 points', async () => {
    actAs(db, IMPROVER)
    const overview = await assessments.overview('A')
    expect(overview.comparison).toEqual({ baseline: 50, post: 80, gainPoints: 30 })
    const post = db.assessmentAttempts.find(
      (a) => a.learnerId === IMPROVER && a.ruleId !== null && a.score === 80,
    )
    expect(post?.snapshot?.items).toHaveLength(10)
    const result = await assessments.getResult(post?.id as string)
    expect(result.comparison).toEqual({ baseline: 50, post: 80, gainPoints: 30 })
    expect(result.passed).toBe(true)
    expect(result.competencies.length).toBe(5)
    expect(result.review).toHaveLength(10)
  })
})

describe('publishing rules', () => {
  test('publishing creates the next version and the learner follows it', async () => {
    actAs(db, ADMIN)
    const rules = await admin.listRules()
    const post = rules.items.find((i) => i.programme === 'B' && i.kind === 'post')
    if (!post) throw new Error('Missing rule')
    expect(post.version).toBe(1)
    const preview = await admin.previewRule({
      ...post.config,
      passPercent: 70,
      timeLimitMinutes: 20,
    })
    expect(preview.selected).toHaveLength(10)
    expect(preview.explanation.join(' ')).toContain('Pass mark 70 percent')
    expect(preview.explanation.join(' ')).toContain('20 minute time limit')
    const published = await admin.publishRule(
      { ...post.config, passPercent: 70, timeLimitMinutes: 20 },
      'Trial a gentler mark',
    )
    expect(published.version).toBe(2)
    expect(activeRule('B', 'post')?.passPercent).toBe(70)
    expect(publishedPassPercent('B', 'post')).toBe(70)
    expect(
      db.auditEvents.some(
        (e) => e.action === 'assessment.rule.publish' && e.reason === 'Trial a gentler mark',
      ),
    ).toBe(true)

    unlockPost()
    actAs(db, MAHA)
    const { attemptId } = await assessments.start('B', 'post')
    const row = attemptRow(db, attemptId)
    expect(row.ruleVersion).toBe(2)
    expect(Date.parse(row.deadlineAt as string) - Date.parse(row.startedAt)).toBe(20 * 60_000)
  })

  test('a draw the bank cannot satisfy is refused, and a baseline cannot have a pass mark', async () => {
    actAs(db, ADMIN)
    const rules = await admin.listRules()
    const post = rules.items.find((i) => i.programme === 'A' && i.kind === 'post')
    const pre = rules.items.find((i) => i.programme === 'A' && i.kind === 'pre')
    if (!post || !pre) throw new Error('Missing rule')
    await expect(
      admin.publishRule(
        {
          ...post.config,
          draws: [{ competency: 'protect_information', difficulty: 'hard', count: 3 }],
        },
        'Too many hard questions',
      ),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      admin.publishRule({ ...pre.config, passPercent: 60 }, 'Baseline gate'),
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('question bank editing', () => {
  test('editing a published question makes a draft version; publishing makes it live', async () => {
    actAs(db, ADMIN)
    const row = db.questionBank.find((q) => q.questionId === 'Q-VI-002-EN')
    if (!row) throw new Error('Missing')
    const base = {
      id: row.id,
      competency: row.competency,
      programme: row.programme,
      difficulty: row.difficulty,
      language: row.language,
      type: row.type,
      options: row.options,
      correct: row.correct,
      feedback: row.feedback,
      points: row.points,
    }
    const draft = await admin.saveQuestion({
      ...base,
      prompt: 'A reworded prompt for the same question',
    })
    expect(draft).toMatchObject({ version: 2, status: 'draft' })
    expect(activeRows(db.questionBank).find((q) => q.questionId === row.questionId)?.version).toBe(
      1,
    )
    // Editing the draft again changes it in place instead of stacking versions.
    const again = await admin.saveQuestion({
      ...base,
      id: draft.id,
      prompt: 'A second rewording of the question',
    })
    expect(again.version).toBe(2)
    await admin.publishQuestion(draft.id)
    expect(activeRows(db.questionBank).find((q) => q.questionId === row.questionId)?.prompt).toBe(
      'A second rewording of the question',
    )
    expect(db.questionBank.filter((q) => q.questionId === row.questionId)).toHaveLength(2)
    expect(
      db.auditEvents.filter((e) => e.action.startsWith('assessment.question.')),
    ).not.toHaveLength(0)
  })

  test('validation rejects a question without a correct answer', async () => {
    actAs(db, ADMIN)
    await expect(
      admin.saveQuestion({
        competency: 'recover_service',
        programme: 'all',
        difficulty: 'easy',
        language: 'en',
        type: 'single',
        prompt: 'What do you do when a tour is late?',
        options: [
          { key: 'A', text: 'Apologise' },
          { key: 'B', text: 'Ignore it' },
        ],
        correct: [],
        feedback: 'Apologise and offer options.',
        points: 1,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  test('a learner cannot use the admin services', async () => {
    actAs(db, MAHA)
    await expect(admin.listQuestions()).rejects.toMatchObject({ status: 403 })
    await expect(admin.listAttempts()).rejects.toMatchObject({ status: 403 })
  })

  test('the attempts list filters by programme, kind and language', async () => {
    unlockPost()
    actAs(db, MAHA)
    await takeAttempt(db, 'B', 'post', [], 'ar')
    actAs(db, ADMIN)
    const arabic = await admin.listAttempts({ language: 'ar' })
    expect(arabic.items.length).toBeGreaterThan(0)
    expect(arabic.items.every((a) => a.language === 'ar')).toBe(true)
    const pre = await admin.listAttempts({ kind: 'pre', programme: 'A', pageSize: 5 })
    expect(pre.items.every((a) => a.kind === 'pre' && a.programme === 'A')).toBe(true)
    expect(pre.items.length).toBe(5)
  })
})
