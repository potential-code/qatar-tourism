import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { reseed } from '@server/db/seed'
import { HAS_TEST_DB } from '../../__tests__/helpers/env'
import { json, signInAs } from '../assignments/assignments.test-helpers'
import { DEMONSTRATION_REPLIES } from './engine/script'

setDefaultTimeout(180_000)

afterEach(() => mock.restore())

beforeAll(async () => {
  if (HAS_TEST_DB) await reseed({ referenceDate: '2026-10-27' })
})

const REPLIES = DEMONSTRATION_REPLIES['changed-booking'] as readonly string[]

async function mahaEnrolment() {
  signInAs('user-l0001', 'learner')
  const res = await app.request('/api/roleplay/overview')
  expect(res.status).toBe(200)
  const body = (await res.json()) as { enrolments: { id: string; programmeCode: string }[] }
  const enrolment = body.enrolments.find((e) => e.programmeCode === 'B')
  if (!enrolment) throw new Error('Maha has no B enrolment')
  return enrolment.id
}

describe.skipIf(!HAS_TEST_DB)('AI practice API', () => {
  test('lists the four scenarios with competency, difficulty and duration', async () => {
    signInAs('user-l0001', 'learner')
    const res = await app.request('/api/roleplay/overview')
    const body = (await res.json()) as {
      label: string
      scenarios: { key: string; competency: string; difficulty: string; estimatedMinutes: number }[]
    }
    expect(body.label).toBe('Simulated AI practice')
    expect(body.scenarios).toHaveLength(4)
    for (const s of body.scenarios) {
      expect(s.competency).toBeTruthy()
      expect(s.difficulty).toBeTruthy()
      expect(s.estimatedMinutes).toBeGreaterThan(0)
    }
  })

  test('the visitor replies turn by turn', async () => {
    signInAs('user-l0001', 'learner')
    const res = await app.request(
      '/api/roleplay/turn',
      json({ scenarioKey: 'changed-booking', learnerTurns: [REPLIES[0]] }),
    )
    const body = (await res.json()) as { reply: string; done: boolean }
    expect(res.status).toBe(200)
    expect(body.reply).toContain('afternoon')
    expect(body.done).toBe(false)
  })

  test('saves a scored attempt and shows best and latest separately', async () => {
    const enrolmentId = await mahaEnrolment()
    const weak = ['Ok.', 'Fine.', 'We have a tour.', 'Bye.', 'Ok then.', 'Yes.']
    const first = await app.request(
      '/api/roleplay/attempts',
      json({ enrolmentId, scenarioKey: 'changed-booking', mode: 'text', learnerTurns: REPLIES }),
    )
    expect(first.status).toBe(201)
    const strong = (await first.json()) as { id: string; totalPercent: number; criteria: unknown[] }
    expect(strong.criteria).toHaveLength(5)

    const second = await app.request(
      '/api/roleplay/attempts',
      json({ enrolmentId, scenarioKey: 'changed-booking', mode: 'voice', learnerTurns: weak }),
    )
    expect(second.status).toBe(201)
    const latest = (await second.json()) as { id: string; totalPercent: number }

    const list = await app.request('/api/roleplay/attempts?scenarioKey=changed-booking')
    const body = (await list.json()) as {
      summary: { best: { id: string }; latest: { id: string } }
    }
    expect(body.summary.latest.id).toBe(latest.id)
    expect(body.summary.best.id).toBe(strong.id)
    expect(strong.totalPercent).toBeGreaterThan(latest.totalPercent)
  })

  test('an unfinished conversation cannot be submitted', async () => {
    const enrolmentId = await mahaEnrolment()
    const res = await app.request(
      '/api/roleplay/attempts',
      json({
        enrolmentId,
        scenarioKey: 'changed-booking',
        mode: 'text',
        learnerTurns: REPLIES.slice(0, 4),
      }),
    )
    expect(res.status).toBe(400)
  })

  test("another learner's enrolment and attempts are not reachable", async () => {
    const enrolmentId = await mahaEnrolment()
    signInAs('user-l0002', 'learner')
    const res = await app.request(
      '/api/roleplay/attempts',
      json({ enrolmentId, scenarioKey: 'changed-booking', mode: 'text', learnerTurns: REPLIES }),
    )
    expect(res.status).toBe(404)
  })

  test('trainers and admins cannot use learner practice endpoints', async () => {
    signInAs('user-t01', 'trainer')
    expect((await app.request('/api/roleplay/overview')).status).toBe(403)
  })
})
