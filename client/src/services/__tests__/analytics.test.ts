import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { getFilterOptions, getOverview, type Overview } from '../analytics.service'
import { getReportPage } from '../reports.service'
import { actAs, freshDemo } from './helpers'

const ADMIN = 'user-admin'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, ADMIN)
})

const overview = (filters: Parameters<typeof getOverview>[0] = {}): Promise<Overview> =>
  getOverview(filters)

describe('metric reconciliation on a fresh seed (brief §15)', () => {
  test('1,200 unique learners, 1,260 enrolments, 122 certified enrolments, 480 completions', async () => {
    const { kpis } = await overview()
    expect(kpis.uniqueLearners).toBe(1200)
    expect(kpis.enrolments).toBe(1260)
    expect(kpis.certificates).toBe(122)
    expect(kpis.completions).toBe(480)
    expect(kpis.completionRate).toBe(38.1)
    expect(kpis.pendingAssessments).toBe(90)
    expect(kpis.activeLearners).toBeGreaterThan(0)
    expect(kpis.activeLearners).toBeLessThanOrEqual(1200)
    expect(kpis.upcomingSessions).toBeGreaterThan(0)
  })

  test('dashboard totals reconcile with the reports', async () => {
    const { kpis, distribution } = await overview()
    const learners = await getReportPage('learners')
    expect(learners.total).toBe(kpis.enrolments)
    expect(learners.summary).toEqual([
      { label: 'Enrolments', value: '1,260' },
      { label: 'Unique learners', value: '1,200' },
    ])
    // KPI counts certified enrolments; the report lists every credential row, including the
    // superseded and revoked prior-cycle ones the 29 Oct seed adds (they share enrolments).
    expect((await getReportPage('certification', { pageSize: 100 })).total).toBe(
      kpis.certificates + 2,
    )
    expect((await getReportPage('assignments', { view: 'pending' })).total).toBe(
      kpis.pendingAssessments,
    )
    for (const { programme, enrolments } of distribution) {
      const key = `program-${programme.toLowerCase()}` as 'program-a' | 'program-b' | 'program-c'
      expect((await getReportPage(key)).total).toBe(enrolments)
    }
  })

  test('programme distribution A 420 / B 660 / C 180, with unique counts beside it', async () => {
    expect((await overview()).distribution).toEqual([
      { programme: 'A', enrolments: 420, learners: 420 },
      { programme: 'B', enrolments: 660, learners: 660 },
      { programme: 'C', enrolments: 180, learners: 180 },
    ])
  })

  test('funnels are programme-specific: only A certifies; steps never increase', async () => {
    const { funnels } = await overview()
    const byCode = Object.fromEntries(funnels.map((f) => [f.programme, f.steps]))
    expect(byCode.A?.at(-1)).toMatchObject({ label: 'Completed and certified', value: 120 })
    expect(byCode.B?.at(-1)).toMatchObject({ label: 'Completed (no certificate)', value: 300 })
    expect(byCode.C?.at(-1)?.value).toBe(60)
    for (const steps of Object.values(byCode)) {
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]?.value ?? 0).toBeLessThanOrEqual(steps[i - 1]?.value ?? 0)
      }
    }
    expect((byCode.B ?? []).map((s) => s.label).join(' ')).not.toMatch(/certified/i)
  })

  test('improvement: 420 pairs, gain from unrounded means matches the report average', async () => {
    const { improvement } = await overview()
    expect(improvement.overall.n).toBe(420)
    expect(improvement.overall.gain).toBeGreaterThan(0)
    expect(improvement.byProgramme.map((p) => [p.programme, p.n])).toEqual([
      ['A', 120],
      ['B', 300],
    ])
    const report = await getReportPage('assessments')
    const average = report.summary.find((s) => s.label === 'Average gain')?.value
    expect(average).toBe(`+${improvement.overall.gain.toFixed(1)} pp`)
  })

  test('performance shows certificates for A only (null for B and C)', async () => {
    const { performance } = await overview()
    expect(performance.map((p) => [p.programme, p.certificates])).toEqual([
      ['A', 122],
      ['B', null],
      ['C', null],
    ])
  })

  test('attendance rate is attended or late over due, non-cancelled bookings', async () => {
    const { attendance } = await overview()
    expect(attendance.due).toBeGreaterThan(0)
    expect(attendance.rate).toBe(Math.round((attendance.present / attendance.due) * 1000) / 10)
  })
})

describe('filters', () => {
  test('programme B: 660 enrolments, no certificates', async () => {
    const { kpis } = await overview({ programme: 'B' })
    expect(kpis).toMatchObject({ enrolments: 660, uniqueLearners: 660, certificates: 0 })
    expect(kpis.completions).toBe(300)
  })

  test('status completed across programmes: 480 enrolments at 100%', async () => {
    const { kpis } = await overview({ status: 'completed' })
    expect(kpis.enrolments).toBe(480)
    expect(kpis.completionRate).toBe(100)
  })

  test('organisation type and seniority slice the learners', async () => {
    expect((await overview({ organisationType: 'hotel_accommodation' })).kpis.uniqueLearners).toBe(
      420,
    )
    expect((await overview({ seniority: 'supervisor' })).kpis.uniqueLearners).toBe(180)
  })

  test('date ranges apply to the chosen date', async () => {
    const completed = await overview({ dateField: 'completion', from: '2020-01-01T00:00:00.000Z' })
    expect(completed.kpis.enrolments).toBe(480)
    const future = await overview({ dateField: 'registration', from: '2030-01-01T00:00:00.000Z' })
    expect(future.kpis.enrolments).toBe(0)
  })

  test('an invalid filter value is a 400', async () => {
    await expect(overview({ programme: 'Z' as 'A' })).rejects.toMatchObject({ status: 400 })
  })

  test('filter options list organisations and paths', async () => {
    const options = await getFilterOptions()
    expect(options.organisations.length).toBeGreaterThan(0)
    expect(options.paths.every((p) => ['A', 'B', 'C'].includes(p.programme))).toBe(true)
  })
})

describe('access', () => {
  for (const [role, id] of [
    ['learner', 'user-l0001'],
    ['trainer', 'user-t01'],
  ] as const) {
    test(`a ${role} is refused the overview and filter options`, async () => {
      actAs(db, id)
      await expect(overview()).rejects.toMatchObject({ status: 403 })
      await expect(getFilterOptions()).rejects.toMatchObject({ status: 403 })
    })
  }
})
