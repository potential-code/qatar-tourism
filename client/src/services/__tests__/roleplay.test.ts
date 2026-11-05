import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { DEMONSTRATION_REPLIES } from '../roleplay/engine/script'
import { createAttempt, getAttempt, getOverview, listAttempts, nextTurn } from '../roleplay.service'
import { actAs, freshDemo } from './helpers'

const MAHA = 'user-l0001'
const OMAR = 'user-l0002'
/** Enrolled in Program A and Program B in the seed. */
const DUAL = 'user-l0070'
const REPLIES = DEMONSTRATION_REPLIES['changed-booking'] as readonly string[]

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, MAHA)
})

async function mahaEnrolment() {
  const overview = await getOverview()
  const enrolment = overview.enrolments.find((e) => e.programmeCode === 'B')
  if (!enrolment) throw new Error('Maha has no B enrolment')
  return enrolment.id
}

describe('AI practice service', () => {
  test('lists the four scenarios with competency, difficulty and duration', async () => {
    const overview = await getOverview()
    expect(overview.label).toBe('Simulated AI practice')
    expect(overview.scenarios).toHaveLength(4)
    for (const s of overview.scenarios) {
      expect(s.competency).toBeTruthy()
      expect(s.difficulty).toBeTruthy()
      expect(s.estimatedMinutes).toBeGreaterThan(0)
    }
  })

  test('the visitor replies turn by turn', async () => {
    const turn = await nextTurn({ scenarioKey: 'changed-booking', learnerTurns: [REPLIES[0]] })
    expect(turn.reply).toContain('afternoon')
    expect(turn.done).toBe(false)
  })

  test('saves a scored attempt with a 5-criterion rubric and shows best and latest separately', async () => {
    const enrolmentId = await mahaEnrolment()
    const weak = ['Ok.', 'Fine.', 'We have a tour.', 'Bye.', 'Ok then.', 'Yes.']
    const strong = await createAttempt({
      enrolmentId,
      scenarioKey: 'changed-booking',
      mode: 'text',
      learnerTurns: REPLIES,
    })
    expect(strong.criteria).toHaveLength(5)
    for (const c of strong.criteria) expect(c.label).not.toBe(c.key)
    const latest = await createAttempt({
      enrolmentId,
      scenarioKey: 'changed-booking',
      mode: 'voice',
      learnerTurns: weak,
    })
    const list = await listAttempts('changed-booking')
    expect(list.summary.latest?.id).toBe(latest.id)
    expect(list.summary.best?.id).toBe(strong.id)
    expect(strong.totalPercent).toBeGreaterThan(latest.totalPercent)
    expect((await getAttempt(strong.id)).transcript[0]?.speaker).toBe('visitor')
    const enrolment = db.enrolments.find((e) => e.id === enrolmentId)
    expect(enrolment?.lastActivityAt).toBe(latest.completedAt)
  })

  test('an unfinished conversation cannot be submitted', async () => {
    const enrolmentId = await mahaEnrolment()
    await expect(
      createAttempt({
        enrolmentId,
        scenarioKey: 'changed-booking',
        mode: 'text',
        learnerTurns: REPLIES.slice(0, 4),
      }),
    ).rejects.toMatchObject({ status: 400, code: 'CONVERSATION_INCOMPLETE' })
  })

  test("another learner's enrolment and attempts are not reachable", async () => {
    const enrolmentId = await mahaEnrolment()
    const attempt = await createAttempt({
      enrolmentId,
      scenarioKey: 'changed-booking',
      mode: 'text',
      learnerTurns: REPLIES,
    })
    actAs(db, OMAR)
    await expect(
      createAttempt({
        enrolmentId,
        scenarioKey: 'changed-booking',
        mode: 'text',
        learnerTurns: REPLIES,
      }),
    ).rejects.toMatchObject({ status: 404 })
    await expect(getAttempt(attempt.id)).rejects.toMatchObject({ status: 404 })
  })

  test('trainers and admins cannot use learner practice', async () => {
    actAs(db, 'user-t01')
    await expect(getOverview()).rejects.toMatchObject({ status: 403 })
    actAs(db, 'user-admin')
    await expect(
      nextTurn({ scenarioKey: 'changed-booking', learnerTurns: ['Hi'] }),
    ).rejects.toMatchObject({ status: 403 })
  })

  test('overview and attempts narrow to one programme for a learner in A and B', async () => {
    actAs(db, DUAL)
    const enrolments = (await getOverview()).enrolments
    const a = enrolments.find((e) => e.programmeCode === 'A')
    const b = enrolments.find((e) => e.programmeCode === 'B')
    if (!a || !b) throw new Error('the learner is not in A and B')
    const run = (enrolmentId: string) =>
      createAttempt({
        enrolmentId,
        scenarioKey: 'changed-booking',
        mode: 'text',
        learnerTurns: REPLIES,
      })
    const inA = await run(a.id)
    const inB = await run(b.id)

    const listB = await listAttempts(undefined, 'B')
    expect(listB.items.every((i) => i.programmeCode === 'B')).toBe(true)
    expect(listB.items.map((i) => i.id)).toContain(inB.id)
    expect(listB.items.map((i) => i.id)).not.toContain(inA.id)
    expect((await listAttempts('changed-booking', 'A')).items.map((i) => i.id)).not.toContain(
      inB.id,
    )
    expect((await listAttempts()).items.map((i) => i.id)).toEqual(
      expect.arrayContaining([inA.id, inB.id]),
    )

    const overviewB = await getOverview('B')
    expect(overviewB.enrolments).toHaveLength(enrolments.length)
    expect(overviewB.summary.attempts).toBe(listB.items.length)
    await expect(getOverview('Z' as 'A')).rejects.toMatchObject({ status: 400 })
  })
})
