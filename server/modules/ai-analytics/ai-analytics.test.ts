import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { reseed } from '@server/db/seed'
import type { AnalyticsAnswer } from '@shared/schemas/admin-ai'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { stubSession } from '../../__tests__/helpers/session'
import { match, SUGGESTED_PROMPTS } from './ai-analytics.intents'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

async function ask(question: string): Promise<AnalyticsAnswer> {
  stubSession('admin')
  const res = await app.request('/api/ai-analytics/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
    body: JSON.stringify({ question }),
  })
  expect(res.status).toBe(200)
  return (await res.json()) as AnalyticsAnswer
}

/** Every answer carries the brief §13 essentials. */
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
  test('1. learners in each programme: the brief example, verbatim numbers', async () => {
    const a = await ask(SUGGESTED_PROMPTS[0])
    expectComplete(a)
    expect(a.prose).toBe(
      'There are 1,200 unique learners and 1,260 programme enrolments. Program A has 420, Program B has 660 and Program C has 180.',
    )
    expect(a.chart?.type).toBe('column')
    expect(a.table?.rows).toHaveLength(3)
  })

  test('2. lowest completion organisations, ascending, minimum sample applied', async () => {
    const a = await ask(SUGGESTED_PROMPTS[1])
    expectComplete(a)
    const rates = (a.chart?.type === 'bar' ? a.chart.data : []).map((d) => d.value)
    expect(rates.length).toBeGreaterThan(0)
    expect(rates).toEqual([...rates].sort((x, y) => x - y))
  })

  test('3. Program B pre and post: 300 pairs and a positive gain', async () => {
    const a = await ask(SUGGESTED_PROMPTS[2])
    expectComplete(a)
    expect(a.sampleSize?.value).toBe(300)
    expect(a.prose).toMatch(/gain of \+\d/)
    expect(a.filters).toContainEqual({ label: 'Programme', value: 'Program B' })
  })

  test('4. trainers with unmarked assignments total the 90 pending submissions', async () => {
    const a = await ask(SUGGESTED_PROMPTS[3])
    expectComplete(a)
    expect(a.sampleSize?.value).toBe(90)
  })

  test('5. attendance by delivery format: in person and online', async () => {
    const a = await ask(SUGGESTED_PROMPTS[4])
    expectComplete(a)
    expect(a.table?.rows.map((r) => r.format)).toEqual(['In person', 'Live online'])
  })

  test('6. Program A certification readiness never counts B', async () => {
    const a = await ask(SUGGESTED_PROMPTS[5])
    expectComplete(a)
    expect(a.sampleSize?.value).toBe(420)
    expect(a.prose).toContain('120 already hold an issued certificate')
  })

  test('7. inactive for two weeks', async () => {
    const a = await ask(SUGGESTED_PROMPTS[6])
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
    const a = await ask('Who is doing best?')
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
      expectComplete(await ask(prompt))
    }
  })

  test('unsupported data says what is unavailable and invents nothing', async () => {
    const a = await ask('What revenue did the Academy make last quarter?')
    expect(a.kind).toBe('unsupported')
    expect(a.prose).toContain('financial data')
    expect(a.chart).toBeNull()
    expect(a.table).toBeNull()
    expect(a.sampleSize).toBeNull()
  })

  test('hidden personal fields are refused', async () => {
    const a = await ask("List Maha's email address and phone number")
    expect(a.kind).toBe('refused')
    expect(JSON.stringify(a)).not.toContain('@example.com')
  })

  test('writes are refused (read-only)', async () => {
    const a = await ask('Delete all inactive learners')
    expect(a.kind).toBe('refused')
    expect(a.prose).toContain('read-only')
  })

  test('arbitrary database queries are refused', async () => {
    expect((await ask('select * from user where role = admin')).kind).toBe('refused')
  })

  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403`, async () => {
      stubSession(role)
      const res = await app.request('/api/ai-analytics/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
        body: JSON.stringify({ question: 'How many learners are in each programme?' }),
      })
      expect(res.status).toBe(403)
    })
  }
})
