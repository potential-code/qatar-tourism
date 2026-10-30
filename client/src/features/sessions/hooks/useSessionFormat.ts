import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const TIME_ZONE = 'Asia/Qatar'

type Instant = string | Date

const toDate = (value: Instant) => (typeof value === 'string' ? new Date(value) : value)

/**
 * Date and time formatting for the learner session screens, in the visitor's language. All values
 * are shown in Qatar time (Asia/Qatar, no daylight saving). Arabic keeps Western digits so times
 * and counts line up with the rest of the product; layout direction comes from `<html dir>`.
 */
export function useSessionFormat() {
  const { t, i18n } = useTranslation('sessions')
  const locale = i18n.language === 'ar' ? 'ar-QA-u-nu-latn' : 'en-GB'
  return useMemo(() => {
    const make = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, ...options })
    const time = make({ hour: '2-digit', minute: '2-digit', hour12: false })
    const short = make({ weekday: 'short', day: 'numeric', month: 'short' })
    const long = make({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const day = make({ day: 'numeric' })
    const month = make({ month: 'short' })
    const weekday = make({ weekday: 'short' })
    const date = make({ day: 'numeric', month: 'short', year: 'numeric' })
    const label = t('qatarTime')
    const fmtTime = (iso: Instant) => time.format(toDate(iso))
    const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return {
      time: fmtTime,
      dateShort: (iso: Instant) => short.format(toDate(iso)),
      dateLong: (iso: Instant) => long.format(toDate(iso)),
      day: (iso: Instant) => day.format(toDate(iso)),
      month: (iso: Instant) => month.format(toDate(iso)),
      weekday: (iso: Instant) => weekday.format(toDate(iso)),
      /** The viewer's own time, only when their zone shows a different clock time; else null. */
      localHint: (iso: string): string | null => {
        const at = new Date(iso)
        const own = new Intl.DateTimeFormat(locale, {
          timeZone: deviceZone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(at)
        if (own === fmtTime(at)) return null
        const day = new Intl.DateTimeFormat(locale, {
          timeZone: deviceZone,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(at)
        return `${day}، ${own} ${t('yourTime')}`
      },
      duration: (minutes: number): string => {
        if (minutes < 60) return t('duration.minutes', { count: minutes })
        const hours = minutes / 60
        if (!Number.isInteger(hours)) return t('duration.minutes', { count: minutes })
        return hours === 1 ? t('duration.oneHour') : t('duration.hours', { count: hours })
      },
      location: (session: {
        format: 'in_person' | 'online'
        venue: string | null
        room: string | null
        meetingRef: string | null
      }): string => {
        if (session.format === 'in_person') {
          return [session.venue, session.room].filter(Boolean).join(', ') || t('location.venueTbc')
        }
        return session.meetingRef
          ? t('location.demoRoom', { ref: session.meetingRef })
          : t('location.onlineTbc')
      },
      /** "27 Oct 2026, 09:00 Qatar time" */
      dateTime: (iso: Instant) => `${date.format(toDate(iso))}, ${fmtTime(iso)} ${label}`,
      /** "Tue 27 Oct, 09:00 to 10:00 Qatar time" */
      range: (start: Instant, end: Instant) =>
        t('range', {
          date: short.format(toDate(start)),
          from: fmtTime(start),
          to: fmtTime(end),
          zone: label,
        }),
    }
  }, [locale, t])
}
