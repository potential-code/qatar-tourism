import { describe, expect, test } from 'bun:test'
import {
  filterChips,
  filterSearchSchema,
  pickFilters,
  toApiFilters,
} from '@/features/admin-dashboard/utils/filters'

describe('admin dashboard filters', () => {
  test('bad URL values fall back to unset instead of throwing', () => {
    expect(
      filterSearchSchema.parse({ programme: 'Z', from: 'yesterday', seniority: 'supervisor' }),
    ).toEqual({
      seniority: 'supervisor',
    })
  })

  test('date range becomes Qatar-day instants with an explicit basis', () => {
    expect(
      toApiFilters({
        programme: 'B',
        from: '2026-10-01',
        to: '2026-10-27',
        dateField: 'completion',
      }),
    ).toEqual({
      programme: 'B',
      dateField: 'completion',
      from: '2026-09-30T21:00:00.000Z',
      to: '2026-10-27T20:59:59.999Z',
    })
  })

  test('date basis defaults to registration and is omitted without a range', () => {
    expect(toApiFilters({ from: '2026-10-01' }).dateField).toBe('registration')
    expect(toApiFilters({ dateField: 'activity' })).toEqual({})
  })

  test('chips name every active filter, including what the date refers to', () => {
    const chips = filterChips({
      programme: 'A',
      status: 'completed',
      from: '2026-10-01',
      dateField: 'activity',
    })
    expect(chips.map((c) => `${c.label}: ${c.value}`)).toEqual([
      'Programme: Program A',
      'Learner status: Completed',
      'Last activity date: From 1 Oct 2026',
    ])
  })

  test('pickFilters drops list state so it can travel to another report', () => {
    expect(pickFilters({ programme: 'C', page: 3, search: 'x' } as never)).toEqual({
      programme: 'C',
    })
  })
})
