import { afterEach, describe, expect, test } from 'bun:test'
import { leaveForcedLanguage, resources, setAppLanguage } from '@/i18n'
import {
  dateChip,
  formatLabel,
  minutesLabel,
  qatarTimeLabel,
  sessionDay,
  sessionTimeRange,
} from '../utils/format'

afterEach(async () => {
  localStorage.clear()
  await leaveForcedLanguage()
  await setAppLanguage('en')
})

describe('session text in Arabic', () => {
  test('English is unchanged', () => {
    expect(formatLabel('online')).toBe('Live online')
    expect(minutesLabel(90)).toBe('1 h 30 min')
    expect(qatarTimeLabel()).toBe('Qatar time')
    expect(sessionTimeRange('2026-10-29T06:00:00.000Z', '2026-10-29T07:00:00.000Z')).toBe(
      '09:00 to 10:00',
    )
  })

  test('Arabic uses Arabic labels with Western digits and Qatar time', async () => {
    await setAppLanguage('ar')
    expect(formatLabel('online')).toBe(resources.ar.public.sessions.liveOnline)
    expect(qatarTimeLabel()).toBe(resources.ar.public.sessions.qatarTime)
    expect(minutesLabel(45)).toBe('45 دقيقة')
    // 22:30 UTC is already the next calendar day (30) in Qatar.
    expect(dateChip('2026-10-29T22:30:00.000Z').day).toBe('30')
    expect(sessionDay('2026-10-29T06:00:00.000Z', true)).toMatch(/29/)
    expect(sessionDay('2026-10-29T06:00:00.000Z', true)).toMatch(/[؀-ۿ]/)
    expect(sessionTimeRange('2026-10-29T06:00:00.000Z', '2026-10-29T07:00:00.000Z')).toBe(
      '09:00 - 10:00',
    )
  })
})
