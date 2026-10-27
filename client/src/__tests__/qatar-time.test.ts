import { describe, expect, test } from 'bun:test'
import {
  qatarDate,
  qatarDateKey,
  qatarDateTime,
  qatarRange,
  qatarTime,
  qatarToIso,
} from '@/lib/format/qatar-time'

// 06:00 UTC is 09:00 in Qatar (UTC+3, no daylight saving).
const ISO = '2026-10-29T06:00:00.000Z'

describe('shared Qatar time formatter', () => {
  test('times and dates are shown in Asia/Qatar', () => {
    expect(qatarTime(ISO)).toBe('09:00')
    expect(qatarDate(ISO)).toBe('29 Oct 2026')
    expect(qatarDate(ISO, { month: 'long' })).toBe('29 October 2026')
    expect(qatarDate(ISO, { year: false })).toBe('29 Oct')
  })

  test('date and time carry the Qatar time label unless asked not to', () => {
    expect(qatarDateTime(ISO)).toBe('29 Oct 2026, 09:00 Qatar time')
    expect(qatarDateTime(ISO, { year: false, label: false })).toBe('29 Oct, 09:00')
    expect(qatarDateTime(null)).toBe('')
  })

  test('ranges, keys and wall-clock conversion agree', () => {
    // ICU builds differ on the comma after the weekday.
    expect(qatarRange(ISO, '2026-10-29T07:00:00.000Z')).toMatch(
      /^Thu,? 29 Oct, 09:00 to 10:00 Qatar time$/,
    )
    expect(qatarDateKey('2026-10-29T22:30:00.000Z')).toBe('2026-10-30')
    expect(qatarToIso('2026-10-29', '09:00')).toBe(ISO)
  })
})
