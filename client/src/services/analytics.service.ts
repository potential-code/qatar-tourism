import { type ReportFilters, reportFilters } from '@shared/schemas'
import type { z } from 'zod'
import { listFilterOptions, loadFacts } from './analytics/facts'
import { type CohortFilters, cohort } from './analytics/filters'
import * as m from './analytics/metrics'
import { METRICS } from './analytics/registry'
import { delay, parseInput, referenceDate, requireRole } from './api'

/**
 * Academy-wide analytics (brief §12), formerly /api/analytics. Admin only (shared/permissions.ts
 * 'analytics.use': trainers have "No Academy-wide access"). Every widget is computed from one
 * consistent read of the facts, with the same metric functions Reports and the AI assistant use.
 */

export type OverviewFilters = Partial<z.input<typeof reportFilters>>

/** Every widget of the Overview dashboard, computed from one consistent read. */
export async function getOverview(input: OverviewFilters = {}) {
  await delay()
  requireRole('admin')
  const filters: ReportFilters = parseInput(reportFilters, input, 'query')
  const facts = loadFacts()
  const rows = cohort(facts, filters)
  const asOf = facts.asOf
  const upcoming = m.upcomingSessions(facts, filters)
  const attendance = m.attendanceRate(facts, rows)
  const inactive = m.inactiveLearners(rows, asOf)
  const backlog = m.markingBacklog(facts, rows)

  return {
    asOf: asOf.toISOString(),
    referenceDate: referenceDate(),
    filters: filters as CohortFilters,
    definitions: METRICS,
    kpis: {
      uniqueLearners: m.uniqueLearners(rows),
      activeLearners: m.activeLearners(rows, asOf),
      enrolments: m.enrolmentCount(rows),
      completions: m.completions(rows),
      completionRate: m.completionRate(rows),
      pendingAssessments: m.pendingAssessments(rows),
      upcomingSessions: upcoming.length,
      certificates: m.certificateCount(rows),
    },
    distribution: m.distribution(rows),
    funnels: m.PROGRAMMES.map((programme) => ({
      programme,
      steps: m.funnel(rows, programme),
    })).filter((entry) => (entry.steps[0]?.value ?? 0) > 0),
    improvement: m.improvement(rows),
    attendance: { ...attendance, byFormat: m.attendanceByFormat(facts, rows) },
    nearingCapacity: m.sessionsNearingCapacity(facts, filters).map((s) => ({
      sessionId: s.sessionId,
      code: s.code,
      title: s.title,
      programme: s.programme,
      trainerName: s.trainerName,
      format: s.format,
      startsAt: s.startsAt.toISOString(),
      capacity: s.capacity,
      confirmed: s.confirmed,
      waitlisted: s.waitlisted,
    })),
    /** Context for the capacity panel: the most-booked upcoming sessions below the threshold. */
    nextFullest: upcoming
      .filter((s) => s.capacity > 0 && s.confirmed / s.capacity < 0.8)
      .sort((a, b) => b.confirmed / b.capacity - a.confirmed / a.capacity)
      .slice(0, 3)
      .map((s) => ({
        sessionId: s.sessionId,
        code: s.code,
        title: s.title,
        startsAt: s.startsAt.toISOString(),
        capacity: s.capacity,
        confirmed: s.confirmed,
      })),
    backlog: backlog.filter((row) => row.total > 0),
    inactive: {
      count: inactive.length,
      sample: inactive.slice(0, 5).map(({ row, days }) => ({
        learnerCode: row.learnerCode,
        learnerName: row.learnerName,
        programme: row.programme,
        days,
      })),
    },
    performance: m.programmePerformance(rows, asOf),
    trend: m.registrationTrend(rows, asOf),
  }
}

/** Organisations and paths for the filter selects. Admin only. */
export async function getFilterOptions() {
  await delay()
  requireRole('admin')
  return listFilterOptions()
}

export type Overview = Awaited<ReturnType<typeof getOverview>>
export type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>
