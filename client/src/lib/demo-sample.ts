import { FICTIONAL_EMAIL_DOMAIN } from '@shared/schemas/common'

/** Six lowercase letters or digits, different on every call (sample answers only). */
export function shortRandom(length = 6): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/** A unique fictional address such as `visitor-k3p9qz@example.com`. */
export const sampleEmail = (prefix: string): string =>
  `${prefix}-${shortRandom()}@${FICTIONAL_EMAIL_DOMAIN}`

/** True when the active i18next language is Arabic. */
export const isArabicLanguage = (lang: string | undefined): boolean =>
  Boolean(lang?.startsWith('ar'))
