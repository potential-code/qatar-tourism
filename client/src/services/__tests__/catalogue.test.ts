import { beforeEach, describe, expect, test } from 'bun:test'
import { now } from '../api'
import {
  getProgramme,
  getTrainer,
  listProgrammes,
  listTrainers,
  listUpcomingSessions,
} from '../catalogue.service'
import { freshDemo } from './helpers'

beforeEach(() => {
  freshDemo()
})

describe('public catalogue (brief §2–3), signed out', () => {
  test('lists A, B and C with the brief copy', async () => {
    const items = await listProgrammes()
    expect(items.map((p) => p.code)).toEqual(['A', 'B', 'C'])
    const [a, b, c] = items
    expect(a).toMatchObject({ cta: 'Join Program A', certificationEnabled: true })
    expect(b).toMatchObject({ cta: 'Start with Program B', certificationEnabled: false })
    expect(c).toMatchObject({ cta: 'Explore sample programme', isIllustrative: true })
  })

  test('a programme overview has its units, trainers, paths and completion rules', async () => {
    const a = await getProgramme('A')
    expect(a.units.map((u) => u.courseCode)).toEqual(expect.arrayContaining(['C01', 'C04', 'C06']))
    expect(a.trainers.length).toBeGreaterThan(0)
    expect(a.completionRules).toMatchObject({ session: 70, finalAssessment: 80 })
    const b = await getProgramme('B')
    expect(b.paths.map((p) => p.code).sort()).toEqual(['B-GENERAL', 'B-HOTEL', 'B-TRANSPORT'])
  })

  test('upcoming sessions are future, published, counted from RSVPs, with no learner data', async () => {
    const items = await listUpcomingSessions()
    expect(items).toHaveLength(20)
    for (const session of items) {
      expect(new Date(session.startsAt).getTime()).toBeGreaterThan(now().getTime() - 60_000)
      expect(['published', 'full']).toContain(session.status)
      expect(session.seatsRemaining).toBe(Math.max(0, session.capacity - session.booked))
      expect(session).not.toHaveProperty('email')
    }
    expect(items[0]?.code).toBe('SES-T01-2')
    expect(items.some((s) => s.seatsRemaining === 0)).toBe(true)
    const onlyB = await listUpcomingSessions('B')
    expect(onlyB.every((s) => s.programmeCode === 'B')).toBe(true)
  })

  test('trainer profiles are public without contact details', async () => {
    const items = await listTrainers()
    expect(items).toHaveLength(10)
    expect(items[0]).not.toHaveProperty('email')
    const t03 = await getTrainer('T03')
    expect(t03.fullName).toBe('Leila Haddad')
    expect(t03.upcomingSessions.length).toBeGreaterThan(0)
    await expect(getTrainer('T99')).rejects.toMatchObject({ status: 404 })
  })
})
