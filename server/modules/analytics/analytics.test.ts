import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { reseed } from '@server/db/seed'
import { stubSession } from '../../__tests__/helpers/session'

setDefaultTimeout(120_000)

/** A fresh snapshot: other suites write to the test database. */
beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

type Overview = {
  kpis: Record<string, number>
  distribution: { programme: string; enrolments: number; learners: number }[]
  funnels: { programme: string; steps: { key: string; label: string; value: number }[] }[]
  improvement: {
    overall: { n: number; gain: number }
    byProgramme: { programme: string; n: number }[]
  }
  attendance: { rate: number; present: number; due: number }
  performance: { programme: string; certificates: number | null; completed: number }[]
}

async function overview(query = ''): Promise<Overview> {
  stubSession('admin')
  const res = await app.request(`/api/analytics/overview${query}`)
  expect(res.status).toBe(200)
  return (await res.json()) as Overview
}

describe('metric reconciliation on a fresh seed (brief §15)', () => {
  test('1,200 unique learners, 1,260 enrolments, 120 certificates, 480 completions', async () => {
    const body = await overview()
    expect(body.kpis.uniqueLearners).toBe(1200)
    expect(body.kpis.enrolments).toBe(1260)
    expect(body.kpis.certificates).toBe(120)
    expect(body.kpis.completions).toBe(480)
    expect(body.kpis.completionRate).toBe(38.1)
    expect(body.kpis.pendingAssessments).toBe(90)
    expect(body.kpis.activeLearners).toBeGreaterThan(0)
    expect(body.kpis.activeLearners).toBeLessThanOrEqual(1200)
    expect(body.kpis.upcomingSessions).toBeGreaterThan(0)
  })

  test('programme distribution A 420 / B 660 / C 180, with unique counts beside it', async () => {
    const body = await overview()
    expect(body.distribution).toEqual([
      { programme: 'A', enrolments: 420, learners: 420 },
      { programme: 'B', enrolments: 660, learners: 660 },
      { programme: 'C', enrolments: 180, learners: 180 },
    ])
  })

  test('funnels are programme-specific: only A certifies; steps never increase', async () => {
    const body = await overview()
    const byCode = Object.fromEntries(body.funnels.map((f) => [f.programme, f.steps]))
    expect(byCode.A?.at(-1)).toMatchObject({ label: 'Completed and certified', value: 120 })
    expect(byCode.B?.at(-1)).toMatchObject({ label: 'Completed (no certificate)', value: 300 })
    expect(byCode.C?.at(-1)?.value).toBe(60)
    for (const steps of Object.values(byCode)) {
      expect(steps?.[0]?.value).toBeGreaterThan(0)
      for (let i = 1; i < (steps?.length ?? 0); i++) {
        expect(steps?.[i]?.value ?? 0).toBeLessThanOrEqual(steps?.[i - 1]?.value ?? 0)
      }
    }
    const labels = (byCode.B ?? []).map((s) => s.label).join(' ')
    expect(labels).not.toMatch(/certified/i)
  })

  test('improvement uses the 420 paired pre/post records with a positive gain', async () => {
    const body = await overview()
    expect(body.improvement.overall.n).toBe(420)
    expect(body.improvement.overall.gain).toBeGreaterThan(0)
    expect(body.improvement.byProgramme.map((p) => [p.programme, p.n])).toEqual([
      ['A', 120],
      ['B', 300],
    ])
  })

  test('performance shows certificates for A only (null for B and C)', async () => {
    const body = await overview()
    expect(body.performance.map((p) => [p.programme, p.certificates])).toEqual([
      ['A', 120],
      ['B', null],
      ['C', null],
    ])
  })

  test('attendance rate is attended or late over due, non-cancelled bookings', async () => {
    const body = await overview()
    expect(body.attendance.due).toBeGreaterThan(0)
    expect(body.attendance.rate).toBe(
      Math.round((body.attendance.present / body.attendance.due) * 1000) / 10,
    )
  })
})

describe('filters', () => {
  test('programme B: 660 enrolments, no certificates', async () => {
    const body = await overview('?programme=B')
    expect(body.kpis.enrolments).toBe(660)
    expect(body.kpis.uniqueLearners).toBe(660)
    expect(body.kpis.certificates).toBe(0)
    expect(body.kpis.completions).toBe(300)
  })

  test('status completed across programmes: 480 enrolments', async () => {
    const body = await overview('?status=completed')
    expect(body.kpis.enrolments).toBe(480)
    expect(body.kpis.completionRate).toBe(100)
  })

  test('organisation type hotel: 420 learners (brief §15 distribution)', async () => {
    const body = await overview('?organisationType=hotel_accommodation')
    expect(body.kpis.uniqueLearners).toBe(420)
  })

  test('seniority supervisor: 180 learners', async () => {
    const body = await overview('?seniority=supervisor')
    expect(body.kpis.uniqueLearners).toBe(180)
  })

  test('a completion-date range excludes enrolments that are not completed', async () => {
    const body = await overview('?dateField=completion&from=2020-01-01T00:00:00.000Z')
    expect(body.kpis.enrolments).toBe(480)
  })

  test('a registration range in the future returns an empty cohort', async () => {
    const body = await overview('?dateField=registration&from=2030-01-01T00:00:00.000Z')
    expect(body.kpis.enrolments).toBe(0)
    expect(body.kpis.uniqueLearners).toBe(0)
  })

  test('an invalid filter value is a 400', async () => {
    stubSession('admin')
    expect((await app.request('/api/analytics/overview?programme=Z')).status).toBe(400)
  })
})

describe('access', () => {
  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403 on the overview and filter options`, async () => {
      stubSession(role)
      expect((await app.request('/api/analytics/overview')).status).toBe(403)
      expect((await app.request('/api/analytics/filter-options')).status).toBe(403)
    })
  }
})
