import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const QATAR_TZ = 'Asia/Qatar'

/**
 * Dates and numbers for the learner record in the language on screen. Arabic keeps Latin digits
 * (`-u-nu-latn`) so IDs, scores and dates read the same next to credential codes. Admin screens
 * stay English, so this resolves to en-GB there.
 */
export function useRecordFormat() {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-QA-u-nu-latn' : 'en-GB'
  return useMemo(() => {
    const date = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: QATAR_TZ,
    })
    const dateTime = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: QATAR_TZ,
    })
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
    return {
      date: (iso: string | null | undefined) => (iso ? date.format(new Date(iso)) : '—'),
      dateTime: (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : '—'),
      number: (value: number) => number.format(value),
    }
  }, [locale])
}
