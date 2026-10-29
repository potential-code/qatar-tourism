import { beforeEach, describe, expect, test } from 'bun:test'
import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import type { DemoDb } from '@/mocks/db'
import { match, SUGGESTED_PROMPTS } from '../ai-analytics/intents'
import { ask, listPrompts } from '../ai-analytics.service'
import { getOverview } from '../analytics.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, 'user-admin')
})

const question = (text: string) => ask({ question: text })

/** Every answer carries the governance the brief asks for (§13). */
function expectComplete(answer: AnalyticsAnswer) {
  expect(answer.kind).toBe('answer')
  expect(answer.assistant).toBe('Demo analytics assistant')
  expect(answer.prose.length).toBeGreaterThan(20)
  expect(answer.chart ?? answer.table).toBeTruthy()
  expect(answer.definition).toBeTruthy()
  expect(answer.period).toBeTruthy()
  expect(answer.sampleSize?.value).toBeGreaterThanOrEqual(0)
  expect(Date.parse(answer.generatedAt)).not.toBeNaN()
  expect(answer.records?.report).toBeTruthy()
  expect(answer.prose).not.toContain('—')
  expect(JSON.stringify(answer)).not.toContain('@example.com')
}

describe('the seven suggested prompts are answered from computed data', () => {
  test('lists the seven prompts verbatim', async () => {
    expect((await listPrompts()).prompts).toEqual([...SUGGESTED_PROMPTS])
  })

  test('1. learners in each programme: the brief example, verbatim numbers', async () => {
    const a = await question(SUGGESTED_PROMPTS[0])
    expectComplete(a)
    expect(a.prose).toBe(
      'There are 1,200 unique learners and 1,260 programme enrolments. Program A has 420, Program B has 660 and Program C has 180.',
    )
    expect(a.chart?.type).toBe('column')
    expect(a.table?.rows).toHaveLength(3)
  })

  test('the answer follows the data, not a script', async () => {
    const extra = structuredClone(db.enrolments.find((e) => e.learnerId === 'user-l0001'))
    if (!extra) throw new Error('no Maha enrolment')
    const programmeA = db.programmes.find((p) => p.code === 'A')
    db.enrolments.push({ ...extra, id: crypto.randomUUID(), programmeId: programmeA?.id ?? '' })
    const a = await question(SUGGESTED_PROMPTS[0])
    expect(a.prose).toContain('1,261 programme enrolments')
    expect(a.prose).toContain('Program A has 421')
  })

  test('2. lowest completion organisations, ascending', async () => {
    const a = await question(SUGGESTED_PROMPTS[1])
    expectComplete(a)
    const rates = (a.chart?.type === 'bar' ? a.chart.data : []).map((d) => d.value)
    expect(rates.length).toBeGreaterThan(0)
    expect(rates).toEqual([...rates].sort((x, y) => x - y))
  })

  test('3. Program B pre and post: 300 pairs, gain matching the dashboard', async () => {
    const a = await question(SUGGESTED_PROMPTS[2])
    expectComplete(a)
    expect(a.sampleSize?.value).toBe(300)
    expect(a.prose).toMatch(/gain of \+\d/)
    expect(a.filters).toContainEqual({ label: 'Programme', value: 'Program B' })
    const dashboard = await getOverview({ programme: 'B' })
    expect(a.prose).toContain(`gain of +${dashboard.improvement.overall.gain}`)
  })

  test('4. trainers with unmarked assignments total the 90 pending submissions', async () => {
    const a = await question(SUGGESTED_PROMPTS[3])
    expectComplete(a)
    expect(a.sampleSize?.value).toBe(90)
  })

  test('5. attendance by delivery format: in person and online', async () => {
    const a = await question(SUGGESTED_PROMPTS[4])
    expectComplete(a)
    expect(a.table?.rows.map((r) => r.format)).toEqual(['In person', 'Live online'])
  })

  test('6. Program A certification readiness never counts B', async () => {
    const a = await question(SUGGESTED_PROMPTS[5])
    expectComplete(a)
    expect(a.sampleSize?.value).toBe(420)
    expect(a.prose).toContain('120 already hold an issued certificate')
  })

  test('7. inactive for two weeks', async () => {
    const a = await question(SUGGESTED_PROMPTS[6])
    expectComplete(a)
    expect(a.records?.search.view).toBe('inactive')
  })

  test('paraphrases reach the same intents', () => {
    const intentOf = (q: string) => {
      const r = match(q)
      return r.kind === 'intent' ? r.intent : r.kind
    }
    expect(intentOf('What is the enrolment split by programme?')).toBe('programme_distribution')
    expect(intentOf('which employers are worst at completing?')).toBe('lowest_completion_orgs')
    expect(intentOf('baseline vs post results for programme B')).toBe('pre_post')
    expect(intentOf('Show the trainer marking backlog')).toBe('trainers_unmarked')
    expect(intentOf('Is attendance better online or in person?')).toBe('attendance_by_format')
    expect(intentOf('Who is eligible for certification in Program A?')).toBe(
      'a_certification_ready',
    )
    expect(intentOf('learners with no activity in 14 days')).toBe('inactive_two_weeks')
  })
})

describe('governance', () => {
  test('a vague question asks which measure is meant', async () => {
    const a = await question('Who is doing best?')
    expect(a.kind).toBe('clarify')
    expect(a.options.map((o) => o.label)).toEqual(['Assessment score', 'Completion', 'Improvement'])
    expect(a.chart).toBeNull()
  })

  test('each clarifying option is itself answerable', async () => {
    for (const prompt of [
      'Who has the best assessment scores?',
      'Which organisations have the best completion rate?',
      'Who improved the most between pre and post?',
    ]) {
      expectComplete(await question(prompt))
    }
  })

  test('unsupported data says what is unavailable and invents nothing', async () => {
    const a = await question('What revenue did the Academy make last quarter?')
    expect(a.kind).toBe('unsupported')
    expect(a.prose).toContain('financial data')
    expect(a.chart).toBeNull()
    expect(a.table).toBeNull()
    expect(a.sampleSize).toBeNull()
  })

  test('personal fields, writes and raw queries are refused', async () => {
    const personal = await question('List the email addresses of Program B learners')
    expect(personal.kind).toBe('refused')
    expect(JSON.stringify(personal)).not.toContain('@example.com')
    const write = await question('Delete the inactive learners')
    expect(write.kind).toBe('refused')
    expect(write.prose).toContain('read-only')
    expect((await question('select * from user where role = admin')).kind).toBe('refused')
  })

  test('an empty question is a validation error', async () => {
    await expect(question(' ')).rejects.toMatchObject({ status: 400 })
  })
})

describe('access', () => {
  for (const id of ['user-l0001', 'user-t01']) {
    test(`${id} is refused`, async () => {
      actAs(db, id)
      await expect(question(SUGGESTED_PROMPTS[0])).rejects.toMatchObject({ status: 403 })
      await expect(listPrompts()).rejects.toMatchObject({ status: 403 })
    })
  }
})
