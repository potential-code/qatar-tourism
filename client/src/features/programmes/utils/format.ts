import i18n from '@/i18n'
import {
  QATAR_TIME_LABEL as QATAR_TIME_LABEL_EN,
  QATAR_TZ,
  qatarDateParts,
  qatarDateShort,
  qatarTimeRange,
  qatarWeekdayLong,
} from '@/lib/format/qatar-time'

/**
 * Session date and time text for the public pages. English comes straight from the shared
 * Qatar-time helpers; Arabic uses the same time zone with Arabic month and weekday names and
 * Western digits (numbers stay consistent with the data). Callers re-render on a language
 * change because the components that use these also call `useTranslation`.
 */
const isArabic = () => (i18n.resolvedLanguage ?? i18n.language) === 'ar'

const AR_LOCALE = 'ar-QA-u-nu-latn'
const arabic = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(AR_LOCALE, { timeZone: QATAR_TZ, ...options })

/** "Qatar time", or "بتوقيت قطر". */
export const qatarTimeLabel = () =>
  isArabic() ? i18n.t('sessions.qatarTime', { ns: 'public' }) : QATAR_TIME_LABEL_EN

/** Kept for callers that want the constant; prefer `qatarTimeLabel()` in components. */
export const QATAR_TIME_LABEL = QATAR_TIME_LABEL_EN

/** "Tue 29 Oct", or "Tuesday 29 October" when `long`, in Qatar time. */
export function sessionDay(iso: string, long = false): string {
  if (isArabic()) {
    const date = new Date(iso)
    return long
      ? arabic({ weekday: 'long', day: 'numeric', month: 'long' }).format(date)
      : arabic({ weekday: 'short', day: 'numeric', month: 'short' }).format(date)
  }
  return long ? qatarWeekdayLong(iso) : qatarDateShort(iso)
}

/** "09:00 to 10:00" in Qatar time ("09:00 إلى 10:00" in Arabic). */
export function sessionTimeRange(startIso: string, endIso: string): string {
  if (!isArabic()) return qatarTimeRange(startIso, endIso)
  const time = arabic({ hour: '2-digit', minute: '2-digit', hour12: false })
  return `${time.format(new Date(startIso))} - ${time.format(new Date(endIso))}`
}

/** Calendar chip parts: weekday, day number and month in Qatar time. */
export function dateChip(iso: string) {
  if (!isArabic()) return qatarDateParts(iso)
  const date = new Date(iso)
  return {
    weekday: arabic({ weekday: 'short' }).format(date),
    day: arabic({ day: 'numeric' }).format(date),
    month: arabic({ month: 'short' }).format(date),
  }
}

export function formatLabel(format: 'in_person' | 'online'): string {
  return i18n.t(format === 'in_person' ? 'sessions.inPerson' : 'sessions.liveOnline', {
    ns: 'public',
  })
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return i18n.t('units.minutes', { ns: 'public', n: minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest !== 0) return i18n.t('units.hoursMinutes', { ns: 'public', h: hours, m: rest })
  return hours === 1
    ? i18n.t('units.hourOne', { ns: 'public' })
    : i18n.t('units.hours', { ns: 'public', n: hours })
}
