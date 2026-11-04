import { isArabicLanguage, shortRandom } from '@/lib/demo-sample'
import type { ExternalDraft } from '@/services/credentials/external-validation'

/** `YYYY-MM-DD` shifted by whole days (UTC arithmetic, so no timezone drift). */
export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Presenter sample for "Add certificate": training done elsewhere at a fictional provider.
 * Dates follow the demo clock's `today`; the reference is new on every click so the
 * duplicate check never fires.
 */
export function sampleExternal(today: string, lang: string): ExternalDraft {
  const ref = `GHTI-${shortRandom(5).toUpperCase()}`
  const issuedOn = shiftDate(today, -45)
  return {
    title: isArabicLanguage(lang)
      ? 'شهادة سلامة الغذاء في الضيافة، المستوى الثاني'
      : 'Food Safety in Hospitality, Level 2',
    issuer: isArabicLanguage(lang)
      ? 'معهد الخليج للتدريب الفندقي'
      : 'Gulf Hospitality Training Institute',
    externalRef: ref,
    issuedOn,
    expiresOn: shiftDate(issuedOn, 3 * 365),
    claimedAmount: '6',
    unit: 'hours',
    competency: 'protect_information',
    verificationUrl: `https://verify.example.com/certificates/${ref}`,
  }
}
